// ========================================
// RECOMMENDATION SYSTEM UTILITIES
// Mathematical functions for ML operations
// ========================================

/**
 * Cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical direction)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Pearson correlation coefficient
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  
  const n = a.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  
  const numerator = sumAB - (sumA * sumB) / n;
  const denominator = Math.sqrt(
    (sumA2 - sumA * sumA / n) * (sumB2 - sumB * sumB / n)
  );
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Jaccard similarity for sets
 */
export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

/**
 * Normalize value to 0-1 range using min-max scaling
 */
export function minMaxNormalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

/**
 * Z-score normalization
 */
export function zScoreNormalize(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Sigmoid function for smooth weighting
 */
export function sigmoid(x: number, k: number = 1): number {
  return 1 / (1 + Math.exp(-k * x));
}

/**
 * Exponential decay for time-based weighting
 * @param daysAgo Number of days since event
 * @param halfLife Days for weight to drop to 0.5
 */
export function timeDecay(daysAgo: number, halfLife: number = 30): number {
  return Math.exp(-Math.log(2) * daysAgo / halfLife);
}

/**
 * Weighted moving average
 */
export function weightedMovingAverage(
  values: number[], 
  weights: number[]
): number {
  if (values.length !== weights.length || values.length === 0) return 0;
  
  let sum = 0;
  let weightSum = 0;
  
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    weightSum += weights[i];
  }
  
  return weightSum > 0 ? sum / weightSum : 0;
}

/**
 * Calculate percentile rank
 */
export function percentileRank(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  
  const count = sortedValues.filter(v => v < value).length;
  return count / sortedValues.length;
}

/**
 * Standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Softmax function for probability distribution
 */
export function softmax(values: number[]): number[] {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  
  return exps.map(e => e / sumExps);
}

/**
 * Top-k selection with diversity
 * Uses Maximal Marginal Relevance algorithm
 */
export function selectDiverseTopK<T>(
  items: { item: T; score: number; vector: number[] }[],
  k: number,
  lambda: number = 0.5
): T[] {
  if (items.length <= k) return items.map(i => i.item);
  
  const selected: typeof items = [];
  const remaining = [...items];
  
  // First item: highest score
  remaining.sort((a, b) => b.score - a.score);
  selected.push(remaining.shift()!);
  
  // Remaining items: balance relevance with diversity
  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestMMR = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      
      // Relevance component
      const relevance = item.score;
      
      // Diversity component (max similarity to already selected)
      let maxSim = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(item.vector, sel.vector);
        if (sim > maxSim) maxSim = sim;
      }
      
      // Maximal Marginal Relevance
      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      
      if (mmr > bestMMR) {
        bestMMR = mmr;
        bestIdx = i;
      }
    }
    
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  
  return selected.map(s => s.item);
}

/**
 * Calculate diversity score for a set of items
 */
export function calculateDiversityScore(vectors: number[][]): number {
  if (vectors.length < 2) return 0;
  
  let totalDist = 0;
  let pairs = 0;
  
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      totalDist += euclideanDistance(vectors[i], vectors[j]);
      pairs++;
    }
  }
  
  return pairs > 0 ? totalDist / pairs : 0;
}

/**
 * Array operations
 */
export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
}

export function vectorAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] || 0));
}

export function vectorMultiply(vec: number[], scalar: number): number[] {
  return vec.map(v => v * scalar);
}

export function vectorMean(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  
  const dims = vectors[0].length;
  const sum = new Array(dims).fill(0);
  
  for (const vec of vectors) {
    for (let i = 0; i < dims; i++) {
      sum[i] += vec[i];
    }
  }
  
  return sum.map(s => s / vectors.length);
}

/**
 * Smoothing function for sparse data
 * Laplace smoothing (add-1)
 */
export function laplaceSmooth(count: number, total: number, categories: number): number {
  return (count + 1) / (total + categories);
}

/**
 * TF-IDF inspired weighting for tag importance
 */
export function calculateTagWeight(
  tagCount: number,
  totalDocs: number,
  docsWithTag: number
): number {
  const tf = tagCount;
  const idf = Math.log(totalDocs / (docsWithTag + 1));
  return tf * idf;
}

/**
 * Interpolation for smooth transitions
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
