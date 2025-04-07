// errorCorrectionSimulator.js

// DOM要素の取得
const codingSelect = document.getElementById('codingType');
const noiseSlider = document.getElementById('noiseLevel');
const noiseValueSpan = document.getElementById('noiseLevelValue');
const runButton = document.getElementById('runErrorSim');
const resultDiv = document.getElementById('resultText'); // 結果表示領域

// ノイズスライダーの値更新
noiseSlider.addEventListener('input', () => {
  noiseValueSpan.textContent = noiseSlider.value;
});

// ----- 拡張ハミング符号 (Hamming(8,4)) のエンコード -----
// 4ビットのデータから、Hamming(7,4) を計算し、さらに全体偶数パリティビットを追加する。
function encodeExtendedHamming(bits) {
  // bits: 4ビット配列 [d1, d2, d3, d4]
  let d1 = bits[0], d2 = bits[1], d3 = bits[2], d4 = bits[3];
  // Hamming(7,4) のパリティビット計算
  let p1 = d1 ^ d2 ^ d4;
  let p2 = d1 ^ d3 ^ d4;
  let p3 = d2 ^ d3 ^ d4;
  // 7ビットコードワード: [p1, p2, d1, p3, d2, d3, d4]
  let code7 = [p1, p2, d1, p3, d2, d3, d4];
  // 全体パリティ p0: 7ビット全体の XOR を計算（偶数パリティにする）
  let p0 = code7.reduce((acc, bit) => acc ^ bit, 0);
  // 拡張符号語: [p0, p1, p2, d1, p3, d2, d3, d4]
  return [p0].concat(code7);
}

// ----- 拡張ハミング符号のデコード -----
// 受信した8ビット符号語について、下位7ビットでシンドロームを計算し、全体パリティもチェックする。
function decodeExtendedHamming(extCodeword) {
  // extCodeword: 8ビット配列 [p0, p1, p2, d1, p3, d2, d3, d4]
  let code7 = extCodeword.slice(1);
  let s1 = code7[0] ^ code7[2] ^ code7[4] ^ code7[6];
  let s2 = code7[1] ^ code7[2] ^ code7[5] ^ code7[6];
  let s3 = code7[3] ^ code7[4] ^ code7[5] ^ code7[6];
  let syndrome = (s3 << 2) | (s2 << 1) | s1; // 1～7（0なら誤りなし）
  // 全体パリティチェック: XOR 全8ビット（偶数パリティなら結果は0）
  let overallCalc = extCodeword.reduce((acc, bit) => acc ^ bit, 0);
  let corrected = extCodeword.slice();
  let errorPosition = 0; // 0: 全体パリティビット, 1～7: 該当ビット, -1: 複数誤り（訂正不能）
  
  if (syndrome === 0 && overallCalc !== 0) {
    // シンドロームが0なのに全体パリティエラー → 誤りは全体パリティビット (位置0)
    corrected[0] = corrected[0] ^ 1;
    errorPosition = 0;
  } else if (syndrome !== 0 && overallCalc !== 0) {
    // シンドロームありかつ全体パリティエラー → 誤りは syndrome が示す位置（1～7）
    corrected[syndrome] = corrected[syndrome] ^ 1;
    errorPosition = syndrome;
  } else if (syndrome !== 0 && overallCalc === 0) {
    // シンドロームありだが全体パリティ正 → 複数誤りと判断（訂正不能）
    errorPosition = -1;
  }
  return { corrected, syndrome, errorPos: errorPosition, overallCalc };
}

// ----- エラー注入 -----
// 各ビットに対して、指定された確率でビット反転（エラー）を発生させる。
function injectErrors(codeword, noiseProb) {
  return codeword.map(bit => (Math.random() < noiseProb ? 1 - bit : bit));
}

// ----- シミュレーション実行 -----
// 今回はコードワードを8つ（合計32ビットの元データ）とする。
runButton.addEventListener('click', () => {
  const codingType = codingSelect.value;
  const noiseLevel = Number(noiseSlider.value);
  
  // 拡張ハミング符号のみ対応
  if (codingType !== 'extended_hamming') {
    resultDiv.innerHTML = "<p>現時点では拡張ハミング符号 の詳細シミュレーションのみ対応しています。他の符号方式は後日対応予定です。</p>";
    return;
  }
  
  // 元データの生成（32ビット、8グループ分）
  const numDataBits = 32;
  let originalData = [];
  for (let i = 0; i < numDataBits; i++) {
    originalData.push(Math.random() > 0.5 ? 1 : 0);
  }
  
  // 4ビットごとに拡張ハミング符号でエンコード
  let encodedData = [];
  for (let i = 0; i < originalData.length; i += 4) {
    let group = originalData.slice(i, i + 4);
    while (group.length < 4) group.push(0);
    encodedData.push(encodeExtendedHamming(group));
  }
  let encodedDataStr = encodedData.map(word => word.join('')).join(' ');
  
  // エラー注入（各コードワードに対して）
  let receivedData = encodedData.map(word => injectErrors(word, noiseLevel));
  let receivedDataStr = receivedData.map(word => word.join('')).join(' ');
  
  // 各コードワードの復号と詳細情報の収集
  let decodedData = [];
  let detailedInfo = "";
  let totalErrorsDetected = 0;
  
  receivedData.forEach((codeword, idx) => {
    let decodeResult = decodeExtendedHamming(codeword);
    // 復号後のデータビットは、訂正後のコードワードの位置 3,5,6,7 (インデックス: 3,5,6,7)
    let dataBits = [decodeResult.corrected[3], decodeResult.corrected[5], decodeResult.corrected[6], decodeResult.corrected[7]];
    decodedData = decodedData.concat(dataBits);
    
    detailedInfo += `<pre>`;
    detailedInfo += `【コードワード ${String(idx+1).padStart(2, '0')}】\n`;
    detailedInfo += `元符号語       : ${encodedData[idx].join('')}\n`;
    detailedInfo += `受信符号語     : ${receivedData[idx].join('')}\n`;
    detailedInfo += `シンドローム   : ${String(decodeResult.syndrome).padStart(2, '0')}\n`;
    detailedInfo += `全体パリティ   : ${decodeResult.overallCalc}\n`;
    if (decodeResult.syndrome === 0 && decodeResult.overallCalc !== 0) {
      detailedInfo += `→ 全体パリティ誤り (位置 00)\n`;
    } else if (decodeResult.syndrome !== 0 && decodeResult.overallCalc !== 0) {
      detailedInfo += `→ 誤り位置     : ${String(decodeResult.errorPos).padStart(2, '0')}\n`;
    } else if (decodeResult.syndrome !== 0 && decodeResult.overallCalc === 0) {
      detailedInfo += `→ 複数誤り検出 (訂正不能)\n`;
    } else {
      detailedInfo += `→ エラーなし\n`;
    }
    detailedInfo += `訂正後符号語   : ${decodeResult.corrected.join('')}\n`;
    detailedInfo += `復号データビット: ${dataBits.join('')}\n`;
    detailedInfo += `----------------------------------------\n`;
    detailedInfo += `</pre>`;
    
    if (decodeResult.errorPos !== 0 && decodeResult.errorPos !== -1) {
      totalErrorsDetected++;
    }
  });
  
  let decodedDataStr = decodedData.join('');
  
  // ----- 受信データ（各コードワードから抽出したデータビット）の取得 -----
  let receivedBits = [];
  receivedData.forEach(codeword => {
    // 受信符号語から、位置 3,5,6,7 のデータビットを抽出
    let bits = [codeword[3], codeword[5], codeword[6], codeword[7]];
    receivedBits = receivedBits.concat(bits);
  });
  let receivedBitsStr = receivedBits.join('');
  
  // ----- 最終的な元データと受信データ、復号データの比較 -----
  let bitErrorsReceived = 0;
  let receivedErrorIndices = [];
  let bitErrorsDecoded = 0;
  let decodedErrorIndices = [];
  for (let i = 0; i < numDataBits; i++) {
    if (originalData[i] !== receivedBits[i]) {
      bitErrorsReceived++;
      receivedErrorIndices.push(String(i + 1).padStart(2, '0'));
    }
    if (originalData[i] !== decodedData[i]) {
      bitErrorsDecoded++;
      decodedErrorIndices.push(String(i + 1).padStart(2, '0'));
    }
  }
  let receivedErrorRate = ((bitErrorsReceived / numDataBits) * 100).toFixed(2);
  let decodedErrorRate = ((bitErrorsDecoded / numDataBits) * 100).toFixed(2);
  
  let finalResult = `<pre>
元データ    : ${originalData.join('')}
受信データ  : ${receivedBitsStr}
復号データ  : ${decodedDataStr}
------------------------------------------------------------
受信データ誤り : ${bitErrorsReceived} / ${numDataBits} (エラーレート: ${receivedErrorRate}%)
復号データ誤り : ${bitErrorsDecoded} / ${numDataBits} (エラーレート: ${decodedErrorRate}%)
エラー箇所      : ${receivedErrorIndices.length > 0 ? receivedErrorIndices.join(', ') : "なし"}
</pre>`;
  
  resultDiv.innerHTML = `
    <h3>拡張ハミング符号 (Hamming(8,4)) 誤り訂正シミュレーション結果</h3>
    <p><strong>元データ (32ビット):</strong> ${originalData.join('')}</p>
    <p><strong>エンコード後データ (拡張符号語, 各8ビット):</strong> ${encodedDataStr}</p>
    <p><strong>受信データ (エラー注入後 符号語):</strong> ${receivedDataStr}</p>
    ${detailedInfo}
    <p><strong>最終的な復号データ (32ビット):</strong> ${decodedData.join('')}</p>
    <p><strong>訂正された符号語数:</strong> ${totalErrorsDetected} / ${encodedData.length} (誤り率: ${(totalErrorsDetected / encodedData.length * 100).toFixed(2)}%)</p>
    ${finalResult}
  `;
});
