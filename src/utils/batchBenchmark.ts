/**
 * Batch Size Benchmark Utility
 *
 * Usage:
 * 1. Import this in your component
 * 2. Call benchmarkBatchSizes(tokens) with your tokens array
 * 3. Check console for results
 */

import type { Token } from '../ts/types/index.js';

interface BenchmarkResult {
  batchSize: number;
  totalTime: number;
  avgBatchTime: number;
  numBatches: number;
  tokensPerSecond: number;
  batchTimes: number[];
}

/**
 * Convert canvas to blob
 */
async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png'
    );
  });
}

/**
 * Test a specific batch size
 */
async function testBatchSize(tokens: Token[], batchSize: number): Promise<BenchmarkResult> {
  const startTime = performance.now();
  const batchTimes: number[] = [];
  let totalBlobs = 0;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batchStartTime = performance.now();
    const batch = tokens.slice(i, Math.min(i + batchSize, tokens.length));

    // Process batch in parallel
    const blobs = await Promise.all(
      batch.map(token => canvasToBlob(token.canvas))
    );

    const batchEndTime = performance.now();
    const batchDuration = batchEndTime - batchStartTime;
    batchTimes.push(batchDuration);
    totalBlobs += blobs.length;

    // Small delay to yield to UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const totalTime = performance.now() - startTime;
  const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
  const numBatches = batchTimes.length;

  return {
    batchSize,
    totalTime: Math.round(totalTime),
    avgBatchTime: Math.round(avgBatchTime),
    numBatches,
    tokensPerSecond: Math.round((totalBlobs / totalTime) * 1000),
    batchTimes: batchTimes.map(t => Math.round(t))
  };
}

/**
 * Run benchmarks for multiple batch sizes
 */
export async function benchmarkBatchSizes(tokens: Token[]): Promise<BenchmarkResult[]> {
  if (tokens.length === 0) {
    console.error('❌ No tokens to benchmark. Generate some tokens first.');
    return [];
  }

  console.clear();
  console.log('%c🔬 Batch Size Benchmark Starting...', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  console.log('━'.repeat(60));
  console.log(`📊 Testing with ${tokens.length} tokens`);
  console.log('━'.repeat(60));

  const batchSizes = [10, 25, 50, 100];
  const results: BenchmarkResult[] = [];

  for (const size of batchSizes) {
    console.log(`\n⏳ Testing batch size: ${size}...`);
    const result = await testBatchSize(tokens, size);
    results.push(result);
    console.log(`✅ Completed in ${result.totalTime}ms`);

    // Wait between tests to let GC run
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Display results
  console.log('\n' + '━'.repeat(60));
  console.log('%c📈 BENCHMARK RESULTS', 'font-size: 14px; font-weight: bold; color: #2196F3;');
  console.log('━'.repeat(60));

  // Table format
  console.table(results.map(r => ({
    'Batch Size': r.batchSize,
    'Total Time (ms)': r.totalTime,
    'Avg Batch (ms)': r.avgBatchTime,
    'Num Batches': r.numBatches,
    'Tokens/sec': r.tokensPerSecond
  })));

  // Find fastest
  const fastest = results.reduce((min, r) => r.totalTime < min.totalTime ? r : min);
  console.log(`\n🏆 Fastest: Batch size ${fastest.batchSize} (${fastest.totalTime}ms)`);

  // Calculate improvements
  const baseline = results[0]; // batch size 10
  console.log('\n📊 Performance vs Baseline (batch size 10):');
  results.slice(1).forEach(r => {
    const improvementNum = ((baseline.totalTime - r.totalTime) / baseline.totalTime * 100);
    const improvement = improvementNum.toFixed(1);
    const sign = improvementNum > 0 ? '+' : '';
    const color = improvementNum > 0 ? '#4CAF50' : '#F44336';
    console.log(
      `%c  Batch ${r.batchSize}: ${sign}${improvement}% ${improvementNum > 0 ? 'faster' : 'slower'}`,
      `color: ${color}; font-weight: bold;`
    );
  });

  // Detailed batch timing analysis
  console.log('\n📉 Batch Timing Details:');
  results.forEach(r => {
    const min = Math.min(...r.batchTimes);
    const max = Math.max(...r.batchTimes);
    const variance = max - min;
    console.log(`  Batch ${r.batchSize}: min=${min}ms, max=${max}ms, variance=${variance}ms`);
  });

  // Recommendations
  console.log('\n' + '━'.repeat(60));
  console.log('%c💡 RECOMMENDATIONS', 'font-size: 14px; font-weight: bold; color: #FF9800;');
  console.log('━'.repeat(60));

  // Find point of diminishing returns (less than 5% improvement)
  let recommended = baseline;
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const curr = results[i];
    const improvement = ((prev.totalTime - curr.totalTime) / prev.totalTime * 100);

    if (improvement < 5) {
      recommended = prev;
      console.log(`  ✅ Optimal batch size: ${recommended.batchSize}`);
      console.log(`  📉 Going higher yields diminishing returns (<5% improvement)`);
      break;
    }

    if (i === results.length - 1) {
      recommended = curr;
      console.log(`  🚀 You might benefit from even larger batch sizes!`);
      console.log(`  💡 Consider testing 150 or 200 tokens per batch.`);
    }
  }

  console.log('\n━'.repeat(60));
  console.log('%c✨ Benchmark Complete!', 'font-size: 16px; font-weight: bold; color: #4CAF50;');
  console.log('━'.repeat(60));

  return results;
}

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).benchmarkBatchSizes = benchmarkBatchSizes;
}
