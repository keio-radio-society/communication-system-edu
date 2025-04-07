// Canvasへの描画を補助する関数群

// 波形描画（時系列データ例）
export function drawWaveform(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = (i / data.length) * width;
      const y = height / 2 - (val * height / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#007acc';
    ctx.stroke();
  }
  
// コンスタレーション描画（シンボル群を描画）
// オプションで最大絶対値(maxAbs)を指定（例: BPSK,QPSK:1, 16QAM:3, 64QAM:7）
export function drawConstellation(canvas, symbols, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
  
    // 中心軸の描画（任意）
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  
    const maxAbs = options.maxAbs || 1; // デフォルトは ±1 (BPSK,QPSK)
    // マージンとして1.5倍する
    const scale = (width / 2 * 0.9) / (maxAbs * 1.5);
  
    symbols.forEach(sym => {
      const x = width / 2 + sym.re * scale;
      const y = height / 2 - sym.im * scale;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = options.color || '#d9534f';
      ctx.fill();
    });
  }
  
  
  // BERグラフ描画（シンプルな棒グラフ）
  export function drawBER(canvas, berValue) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
  
    const barWidth = width * 0.5;
    const barHeight = berValue * height; // berValueは0〜1の値
    ctx.fillStyle = '#5cb85c';
    ctx.fillRect((width - barWidth) / 2, height - barHeight, barWidth, barHeight);
  
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.fillText(`BER: ${berValue.toFixed(4)}`, width / 2, 20);
  }
  