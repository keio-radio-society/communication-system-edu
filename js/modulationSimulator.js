// 変調シミュレーション用モジュール（グラフィカル表示および詳細情報追加）
import { gaussianRandom, snrToNoiseAmplitude } from './common.js';
import { drawWaveform, drawConstellation } from './plot.js';

// DOM要素の取得
const modulationSelect = document.getElementById('modulationType');
const snrSlider = document.getElementById('snr');
const snrValueSpan = document.getElementById('snrValue');
const symbolRateSlider = document.getElementById('symbolRate');
const symbolRateValueSpan = document.getElementById('symbolRateValue');
const runButton = document.getElementById('runSimulation');

const waveformCanvas = document.getElementById('waveformCanvas');
const constellationCanvas = document.getElementById('constellationCanvas');
const idealConstellationCanvas = document.getElementById('idealConstellationCanvas');
const resultTextDiv = document.getElementById('resultText');
const dataRateInfo = document.getElementById('dataRateInfo');
const berValueInfo = document.getElementById('berValueInfo');

// パラメータ表示更新
snrSlider.addEventListener('input', () => {
  snrValueSpan.textContent = snrSlider.value;
});
symbolRateSlider.addEventListener('input', () => {
  symbolRateValueSpan.textContent = symbolRateSlider.value;
});

// 各変調方式のビット数設定
function bitsPerSymbol(modulationType) {
  switch (modulationType) {
    case 'BPSK': return 1;
    case 'QPSK': return 2;
    case '8PSK': return 3;
    case '16QAM': return 4;
    case '64QAM': return 6;
    default: return 1;
  }
}

// 復調処理（各変調方式に対応）
function demodulateSymbol(noisySymbol, modulationType) {
    if (modulationType === 'BPSK') {
      return { re: noisySymbol.re >= 0 ? 1 : -1, im: 0 };
    } else if (modulationType === 'QPSK') {
      return { re: noisySymbol.re >= 0 ? 1 : -1, im: noisySymbol.im >= 0 ? 1 : -1 };
    } else if (modulationType === '8PSK') {
      // 8PSK: 8等分の位相に量子化。入力シンボルの位相を計算
      let angle = Math.atan2(noisySymbol.im, noisySymbol.re);
      if (angle < 0) angle += 2 * Math.PI;
      const sector = Math.round(angle / (2 * Math.PI / 8)) % 8;
      const quantizedAngle = sector * (2 * Math.PI / 8);
      return { re: Math.cos(quantizedAngle), im: Math.sin(quantizedAngle) };
    } else if (modulationType === '16QAM') {
      const levels = [-3, -1, 1, 3];
      const nearestLevel = (val) => levels.reduce((prev, curr) =>
        Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
      return { re: nearestLevel(noisySymbol.re), im: nearestLevel(noisySymbol.im) };
    } else if (modulationType === '64QAM') {
      const levels = [-7, -5, -3, -1, 1, 3, 5, 7];
      const nearestLevel = (val) => levels.reduce((prev, curr) =>
        Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
      return { re: nearestLevel(noisySymbol.re), im: nearestLevel(noisySymbol.im) };
    }
  }

// シンボルをビット列に変換（BPSK, QPSK, 8PSK用）
// QAMの場合はシンボル値の文字列表現を返す
function symbolToBits(symbol, modulationType) {
    if (modulationType === 'BPSK') {
      return symbol.re === 1 ? "1" : "0";
    } else if (modulationType === 'QPSK') {
      if (symbol.re === 1 && symbol.im === 1) return "11";
      if (symbol.re === 1 && symbol.im === -1) return "10";
      if (symbol.re === -1 && symbol.im === 1) return "01";
      if (symbol.re === -1 && symbol.im === -1) return "00";
    } else if (modulationType === '8PSK') {
      // 8PSKの場合、位相からインデックスを算出して3ビットの文字列に変換
      let angle = Math.atan2(symbol.im, symbol.re);
      if (angle < 0) angle += 2 * Math.PI;
      const index = Math.round(angle / (2 * Math.PI / 8)) % 8;
      const mapping = ["000", "001", "010", "011", "100", "101", "110", "111"];
      return mapping[index];
    } else {
      return `(${symbol.re},${symbol.im})`;
    }
  }

// 元のシンボルデータ生成の拡張
// 8PSKの場合、ランダムに0～7の整数から位相を決定
function generateOriginalSymbols(modulationType, numSymbols) {
    let symbols = [];
    if (modulationType === 'BPSK') {
      for (let i = 0; i < numSymbols; i++) {
        symbols.push({ re: Math.random() > 0.5 ? 1 : -1, im: 0 });
      }
    } else if (modulationType === 'QPSK') {
      for (let i = 0; i < numSymbols; i++) {
        const re = Math.random() > 0.5 ? 1 : -1;
        const im = Math.random() > 0.5 ? 1 : -1;
        symbols.push({ re, im });
      }
    } else if (modulationType === '8PSK') {
      for (let i = 0; i < numSymbols; i++) {
        const k = Math.floor(Math.random() * 8); // 0～7
        const angle = (2 * Math.PI * k) / 8;
        symbols.push({ re: Math.cos(angle), im: Math.sin(angle) });
      }
    } else if (modulationType === '16QAM' || modulationType === '64QAM') {
      const levels = modulationType === '16QAM' ? [-3, -1, 1, 3] : [-7, -5, -3, -1, 1, 3, 5, 7];
      for (let i = 0; i < numSymbols; i++) {
        const re = levels[Math.floor(Math.random() * levels.length)];
        const im = levels[Math.floor(Math.random() * levels.length)];
        symbols.push({ re, im });
      }
    }
    return symbols;
  }

// シミュレーション実行
runButton.addEventListener('click', () => {
    const modulationType = modulationSelect.value;
    const snr = Number(snrSlider.value);
    const symbolRate = Number(symbolRateSlider.value);
    
    // 送受信速度の計算
    const bps = bitsPerSymbol(modulationType);
    const dataRate = symbolRate * bps;  // 単位はbps
    dataRateInfo.textContent = `シンボルレート: ${symbolRate} symbols/sec, ビット/シンボル: ${bps}, 推定データ速度: ${dataRate} bps`;
    
    // キャンバスサイズの調整（16QAM, 64QAMの場合）
    if (modulationType === '16QAM') {
      constellationCanvas.width = 500; constellationCanvas.height = 500;
      idealConstellationCanvas.width = 500; idealConstellationCanvas.height = 500;
    } else if (modulationType === '64QAM') {
      constellationCanvas.width = 600; constellationCanvas.height = 600;
      idealConstellationCanvas.width = 600; idealConstellationCanvas.height = 600;
    } else {
      // 8PSK, BPSK, QPSK: 通常サイズ
      constellationCanvas.width = 300; constellationCanvas.height = 300;
      idealConstellationCanvas.width = 300; idealConstellationCanvas.height = 300;
    }
    
    const numSymbols = 50; // 表示文字数調整
    const originalSymbols = generateOriginalSymbols(modulationType, numSymbols);
    
    let maxAbs;
    if (modulationType === 'BPSK' || modulationType === 'QPSK' || modulationType === '8PSK') {
      maxAbs = 1;
    } else if (modulationType === '16QAM') {
      maxAbs = 3;
    } else if (modulationType === '64QAM') {
      maxAbs = 7;
    }
    
    // 理想コンスタレーション（ノイズなし）を描画
    drawConstellation(idealConstellationCanvas, originalSymbols, { color: '#007acc', maxAbs });
    
    // ノイズの追加（受信シンボル生成）
    const noiseAmplitude = snrToNoiseAmplitude(snr);
    const noisySymbols = originalSymbols.map(sym => ({
      re: sym.re + gaussianRandom(0, noiseAmplitude),
      im: sym.im + gaussianRandom(0, noiseAmplitude)
    }));
    
    // 復調処理：各受信シンボルから復調シンボルを計算
    const demodulatedSymbols = noisySymbols.map(sym => demodulateSymbol(sym, modulationType));
    
    // 波形（実部）の描画
    const waveformData = noisySymbols.map(sym => sym.re);
    drawWaveform(waveformCanvas, waveformData);
    
    // 受信コンスタレーションの描画（受信シンボルをそのまま描画）
    drawConstellation(constellationCanvas, noisySymbols, { color: '#d9534f', maxAbs });
    
    // BER計算（単純なダミー計算例：noiseAmplitude / 10）
    const ber = noiseAmplitude / 10;
    berValueInfo.textContent = `BER: ${ber.toFixed(4)}`;
    
    // テキストによる詳細結果の作成
    let originalBitStr = "";
    let receivedBitStr = "";
    let demodulatedBitStr = "";
    let errorCount = 0;
    let errorIndices = [];
    
    for (let i = 0; i < numSymbols; i++) {
      const origBits = symbolToBits(originalSymbols[i], modulationType);
      const noisyBits = symbolToBits(noisySymbols[i], modulationType);
      const demodBits = symbolToBits(demodulatedSymbols[i], modulationType);
      
      originalBitStr += origBits + " ";
      receivedBitStr += noisyBits + " ";
      demodulatedBitStr += demodBits + " ";
      
      if (origBits !== demodBits) {
        errorCount++;
        errorIndices.push(i + 1);
      }
    }
    const correctRatio = ((numSymbols - errorCount) / numSymbols * 100).toFixed(2);
    
    resultTextDiv.innerHTML = `
      <h3>詳細シミュレーション結果</h3>
      <p><strong>元データ (送信データ):</strong><br>${originalBitStr}</p>
      <p><strong>受信データ (ノイズ付):</strong><br>${receivedBitStr}</p>
      <p><strong>復調後データ:</strong><br>${demodulatedBitStr}</p>
      <p>全シンボル数: ${numSymbols}</p>
      <p>誤り個数: ${errorCount}</p>
      <p>正解割合: ${correctRatio}%</p>
      <p>誤りが発生したシンボル位置 (番号): ${errorIndices.join(", ") || "なし"}</p>
      <p><strong>本来送りたいシンボル:</strong> 上記「元データ」が送信データとなります。</p>
    `;
  });