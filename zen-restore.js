// 防首屏闪烁：在解析其余内容前按存档挂上 zen 状态，避免「先普通视图再跳禅模式」的闪一下。
// 外置为普通 <script src>，以符合扩展 CSP（script-src 'self'，禁止 inline）。
// 置于 <body> 第一行，解析到即同步执行，此时 body 已存在、后续内容尚未绘制，故无闪烁。
try {
  var z = JSON.parse(localStorage.getItem('my-homepage-v1') || '{}');
  if (z && z.zen) document.body.classList.add('zen');
} catch (e) {}
