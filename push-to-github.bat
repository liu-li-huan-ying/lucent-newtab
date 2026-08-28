@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ============================================
echo   Lucent - 推送到 GitHub
echo ============================================
echo.
echo 正在连接 GitHub，请稍候...
echo.

git push origin main

echo.
if %errorlevel%==0 (
  echo [成功] 已推送！
  echo 仓库地址: https://github.com/liu-li-huan-ying/lucent-newtab
) else (
  echo [未成功] 多半是网络连不上 GitHub。
  echo 你的代码已经安全保存在本地仓库，不会丢。
  echo 等网络好了，再双击本文件重试即可。
)
echo.
pause
