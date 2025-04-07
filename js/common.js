// 共通ユーティリティ関数や定数を定義

// 乱数生成（ガウス分布）
export function gaussianRandom(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // 0回避
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
  }
  
  // SNRに基づくノイズ振幅計算（単純な例）
  export function snrToNoiseAmplitude(snr_dB) {
    // SNR (dB) -> 線形値
    const snr = Math.pow(10, snr_dB / 10);
    return 1 / Math.sqrt(snr);
  }
  