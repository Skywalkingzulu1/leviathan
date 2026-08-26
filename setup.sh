#!/data/data/com.termux/files/usr/bin/bash
# Leviathan setup script

echo "=== Installing Python ==="
pkg install -y python

echo "=== Installing Ollama ==="
if ! command -v ollama &>/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "=== Starting Ollama ==="
ollama serve &
sleep 3

echo "=== Pulling dolphin-phi ==="
ollama pull dolphin-phi

echo "=== Starting HTTP server on port 8080 ==="
cd /sdcard/leviathan
python -m http.server 8080 &

echo ""
echo "========================================="
echo "DONE! Dashboard at: http://localhost:8080"
echo "Ollama at: http://localhost:11434"
echo "========================================="
