import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      let profObj = null;
      // First try to fetch from backend via /api/me to guarantee synchronization
      try {
        profObj = await api.apiFetch('/api/me');
      } catch (err) {
        // Fallback to supabase direct if backend call fails (e.g., offline)
        if (supabase) {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
          if (!error && data) profObj = data;
        }
      }

      if (profObj && (profObj.role === 'farmer' || !profObj.role)) {
        if (supabase) {
          try {
            const { data: farmerData } = await supabase.from('farmers').select('*').eq('user_id', userId).maybeSingle();
            if (farmerData) {
              profObj.farmer_id = farmerData.id;
              profObj.farm_name = farmerData.farm_name || profObj.full_name;
            } else {
              const { data: newFarmer } = await supabase.from('farmers').upsert([
                {
                  user_id: userId,
                  full_name: profObj.full_name || 'Farmer',
                  farm_name: (profObj.full_name || 'Farmer') + ' Farm',
                  phone: profObj.phone || '',
                }
              ], { onConflict: 'user_id' }).select().maybeSingle();
              if (newFarmer) {
                profObj.farmer_id = newFarmer.id;
              }
            }
          } catch (e) {
            console.warn('Farmer UUID lookup note:', e.message);
          }
        }
      }

      setProfile(profObj);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAuthError = (err) => {
    if (!err) return 'An error occurred during authentication.';
    const msg = err.message || err.error_description || String(err);
    const code = err.code || err.status;
    const lowerMsg = msg.toLowerCase();

    if (
      lowerMsg.includes('email not confirmed') ||
      lowerMsg.includes('email_not_confirmed') ||
      code === 'email_not_confirmed'
    ) {
      return 'Please confirm your email before signing in.';
    }

    if (
      code === 504 ||
      code === '504' ||
      lowerMsg.includes('504') ||
      lowerMsg.includes('gateway timeout') ||
      lowerMsg.includes('upstream request timeout')
    ) {
      return 'Supabase email gateway timed out (HTTP 504). Please ensure Custom SMTP is disabled or configured correctly in Supabase Project Dashboard -> Authentication -> Email Settings.';
    }

    if (
      code === 429 ||
      code === 'over_email_send_rate_limit' ||
      lowerMsg.includes('rate limit') ||
      lowerMsg.includes('over_email_send_rate_limit')
    ) {
      return 'Supabase email rate limit reached. Please wait a few minutes before trying again or sign in with an existing account.';
    }
    return msg;
  };

  const signUp = async (email, password, role, additionalData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: additionalData.full_name,
            role: role,
            phone: additionalData.phone,
          },
        },
      });
      
      if (error) {
        throw new Error(formatAuthError(error));
      }

      if (data?.user) {
        // Create profile record using upsert (handles trigger pre-creation safely)
        const profileData = {
          id: data.user.id,
          email: email,
          role: role,
          full_name: additionalData.full_name,
          phone: additionalData.phone,
        };
        
        const { error: profileError } = await supabase.from('profiles').upsert([profileData]);
        if (profileError) console.warn('Profile sync warning:', profileError.message);

        if (role === 'farmer') {
          const farmerData = {
            user_id: data.user.id,
            full_name: additionalData.full_name,
            farm_name: additionalData.farm_name,
            phone: additionalData.phone,
            location_name: additionalData.village,
            latitude: additionalData.latitude || 17.4210,
            longitude: additionalData.longitude || 78.4420,
          };
          const { error: farmerError } = await supabase.from('farmers').upsert([farmerData], { onConflict: 'user_id' });
          if (farmerError) console.warn('Farmer sync warning:', farmerError.message);
        } else if (role === 'family') {
          const familyData = {
            user_id: data.user.id,
            full_name: additionalData.full_name,
            phone: additionalData.phone,
            delivery_address: additionalData.delivery_address,
            latitude: additionalData.latitude || 17.4210,
            longitude: additionalData.longitude || 78.4420,
          };
          const { error: familyError } = await supabase.from('families').upsert([familyData], { onConflict: 'user_id' });
          if (familyError) console.warn('Family sync warning:', familyError.message);
        }
      }
      
      const isConfirmed = Boolean(data?.session && data?.user?.email_confirmed_at);
      return { data, isConfirmed, isUnconfirmed: !isConfirmed };
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data?.user && !data.user.email_confirmed_at && !data.session) {
        throw new Error('Please confirm your email before signing in.');
      }
      return data;
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  };

  const sendConfirmationEmailAgain = async (emailToResend) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToResend,
      });
      if (error) throw error;
      return { success: true, message: 'Confirmation email sent! Please check your inbox.' };
    } catch (err) {
      throw new Error(formatAuthError(err));
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    sendConfirmationEmailAgain,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
