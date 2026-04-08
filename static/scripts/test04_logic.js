// static/scripts/test04_logic.js
// ステップ2：外部ファイル化のテスト
console.log("External script loaded successfully.");

document.getElementById('testButton').addEventListener('click', () => {
  alert('Hello World from External Script File!');
  console.log('Button clicked from external file!');
});