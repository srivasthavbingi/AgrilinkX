import { regionalSynonyms } from '../data/productCatalog';

/**
 * Semantic NLP & Origin-Aware Matcher for Consumer Queries.
 * Translates queries like "Assam tea leaves" into structured requirements:
 * { product: "Tea", variety: "Tea Leaves", preferredOrigin: "Assam", hasExplicitOrigin: true }
 */
export const knownOrigins = [
  { key: "assam", label: "Assam" },
  { key: "kashmir", label: "Kashmir" },
  { key: "kashmiri", label: "Kashmir" },
  { key: "guntur", label: "Andhra Pradesh (Guntur)" },
  { key: "nashik", label: "Maharashtra (Nashik)" },
  { key: "tandur", label: "Telangana (Tandur)" },
  { key: "nizamabad", label: "Telangana (Nizamabad)" },
  { key: "ooty", label: "Tamil Nadu (Ooty)" },
  { key: "wayanad", label: "Kerala (Wayanad)" },
  { key: "kerala", label: "Kerala" },
  { key: "punjab", label: "Punjab" },
  { key: "mp", label: "Madhya Pradesh" },
  { key: "madhya pradesh", label: "Madhya Pradesh" },
  { key: "nallamala", label: "Telangana (Nallamala)" },
  { key: "himachal", label: "Himachal" },
  { key: "telangana", label: "Telangana" },
];

export const productMatching = {
  /**
   * Parses natural search string into canonical entity structure
   */
  parseUserQuery(queryString) {
    if (!queryString || typeof queryString !== 'string') {
      return {
        product: '',
        variety: '',
        preferredOrigin: null,
        hasExplicitOrigin: false,
        rawQuery: '',
      };
    }

    const clean = queryString.toLowerCase().trim();
    let preferredOrigin = null;
    let hasExplicitOrigin = false;

    // 1. Detect explicit origin
    for (const origin of knownOrigins) {
      if (clean.includes(origin.key)) {
        preferredOrigin = origin.label;
        hasExplicitOrigin = true;
        break;
      }
    }

    // 2. Identify canonical product name
    let detectedProduct = null;
    const words = clean.replace(/[^a-z0-9\s]/g, '').split(/\s+/);

    // Check full query or sub-phrases in regional synonyms
    for (const word of words) {
      if (regionalSynonyms[word]) {
        detectedProduct = regionalSynonyms[word];
        break;
      }
    }

    // Check 2-word combinations (e.g. "tea leaves", "red chilli", "toor dal")
    if (!detectedProduct) {
      for (let i = 0; i < words.length - 1; i++) {
        const combo = `${words[i]}${words[i + 1]}`;
        if (regionalSynonyms[combo]) {
          detectedProduct = regionalSynonyms[combo];
          break;
        }
      }
    }

    // Fallback: capitalized first matching keyword
    if (!detectedProduct) {
      if (clean.includes('tea')) detectedProduct = 'Tea';
      else if (clean.includes('tomato')) detectedProduct = 'Tomato';
      else if (clean.includes('rice')) detectedProduct = 'Rice';
      else if (clean.includes('milk')) detectedProduct = 'Milk';
      else if (clean.includes('dal')) detectedProduct = 'Toor Dal';
      else if (clean.includes('chilli')) detectedProduct = 'Chilli';
      else if (clean.includes('saffron')) detectedProduct = 'Saffron';
      else if (clean.includes('dragon')) detectedProduct = 'Dragon Fruit';
      else if (clean.includes('onion')) detectedProduct = 'Onion';
      else if (clean.includes('spinach')) detectedProduct = 'Spinach';
      else detectedProduct = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    // 3. Detect variety or subtype
    let variety = '';
    if (clean.includes('leaves') || clean.includes('leaf') || clean.includes('orthodox')) {
      variety = 'Tea Leaves';
    } else if (clean.includes('cherry')) {
      variety = 'Cherry';
    } else if (clean.includes('desi') || clean.includes('organic')) {
      variety = 'Desi Organic';
    } else if (clean.includes('basmati')) {
      variety = 'Basmati';
    } else if (clean.includes('a2') || clean.includes('gir')) {
      variety = 'A2 Gir Cow';
    }

    return {
      product: detectedProduct,
      variety,
      preferredOrigin,
      hasExplicitOrigin,
      rawQuery: queryString,
    };
  },

  /**
   * Computes product similarity score between user query and farmer listing (0 to 100)
   */
  calculateMatchScore(parsedQuery, listing) {
    let score = 0;

    const listingProduct = listing.product.toLowerCase();
    const queryProduct = (parsedQuery.product || '').toLowerCase();

    // Exact product match
    if (listingProduct === queryProduct || listingProduct.includes(queryProduct) || queryProduct.includes(listingProduct)) {
      score += 70;
    } else if (listing.category.toLowerCase().includes(queryProduct)) {
      score += 40;
    } else {
      return 0; // Not a relevant product
    }

    // Variety match
    if (parsedQuery.variety) {
      const queryVariety = parsedQuery.variety.toLowerCase();
      const listingVariety = (listing.variety || '').toLowerCase();
      if (listingVariety.includes(queryVariety)) {
        score += 30;
      }
    } else {
      score += 30; // no variety penalty if user didn't specify
    }

    return Math.min(100, score);
  },
};

export default productMatching;
