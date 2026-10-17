#!/usr/bin/env bash
# Installiert oder aktualisiert den Memecoin-Recorder auf Debian, Ubuntu oder Raspberry Pi OS.
#
#   curl -fsSL https://raw.githubusercontent.com/xxneoenxx/Agents/REF/memecoin-bot/deploy/install.sh | sudo bash
#
# Erneut ausführen = Update auf den angegebenen Stand (REF), Einstellungen bleiben erhalten.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/xxneoenxx/Agents.git}"
REF="${REF:-claude/memecoin-fomo-bot}"
APP_DIR=/opt/memecoin-bot
SRC_DIR="$APP_DIR/src"
CODE_DIR="$SRC_DIR/memecoin-bot"
DATA_DIR=/var/lib/memecoin-bot
ENV_FILE=/etc/memecoin-bot.env
SERVICE=memecoin-recorder
BOT_USER=memecoin

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mFehler: %s\033[0m\n' "$*" >&2; exit 1; }
ask() {  # ask VAR "Frage" – liest vom Terminal, auch wenn das Skript per curl | bash läuft
    local __var=$1 __prompt=$2 __reply=""
    if [ -r /dev/tty ]; then read -r -p "$__prompt" __reply < /dev/tty || true; fi
    printf -v "$__var" '%s' "$__reply"
}

[ "$(id -u)" -eq 0 ] || die "Bitte mit sudo ausführen."
command -v apt-get >/dev/null || die "Dieses Skript unterstützt nur Debian/Ubuntu/Raspberry Pi OS."

say "Pakete installieren"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv git ca-certificates curl tzdata >/dev/null
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' \
    || die "Python 3.11 oder neuer nötig (Debian 12 / Ubuntu 24.04 haben das)."

say "Benutzer und Ordner anlegen"
id "$BOT_USER" >/dev/null 2>&1 || useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin "$BOT_USER"
install -d -o "$BOT_USER" -g "$BOT_USER" -m 0750 "$DATA_DIR" "$DATA_DIR/tape"
install -d -m 0755 "$APP_DIR"

say "Code holen ($REF)"
if [ -d "$SRC_DIR/.git" ]; then
    git -C "$SRC_DIR" fetch -q --depth 1 origin "$REF"
    git -C "$SRC_DIR" checkout -q --force FETCH_HEAD
else
    git clone -q --depth 1 --branch "$REF" "$REPO_URL" "$SRC_DIR"
fi
echo "Stand: $(git -C "$SRC_DIR" log -1 --format='%h %s')"

say "Python-Umgebung einrichten (Abhängigkeiten mit Prüfsummen)"
[ -x "$APP_DIR/venv/bin/python" ] || python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install -q --disable-pip-version-check --require-hashes -r "$CODE_DIR/requirements.lock"

if [ ! -f "$ENV_FILE" ]; then
    say "Telegram einrichten"
    echo "Lege vorher in Telegram bei @BotFather einen Bot an (/newbot) und kopiere den Token."
    ask TOKEN "Telegram-Bot-Token (leer lassen = ohne Telegram): "
    CHAT_ID=""
    if [ -n "$TOKEN" ]; then
        echo "Öffne jetzt deinen neuen Bot in Telegram, drück auf START oder schreib ihm 'hallo'."
        ask _ "Danach hier Enter drücken … "
        CHAT_ID=$(curl -fsS "https://api.telegram.org/bot${TOKEN}/getUpdates" | python3 -c '
import json, sys
data = json.load(sys.stdin)
chats = [u["message"]["chat"]["id"] for u in data.get("result", []) if "message" in u]
print(chats[-1] if chats else "")
' || true)
        if [ -n "$CHAT_ID" ]; then
            echo "Chat-ID gefunden: $CHAT_ID"
        else
            echo "Keine Nachricht gefunden – die Chat-ID kannst du später in $ENV_FILE eintragen."
        fi
    fi
    umask 077
    cat > "$ENV_FILE" <<EOF
# Memecoin-Bot – Zugangsdaten (nur root lesbar). Vorlage: $CODE_DIR/deploy/env.example
TELEGRAM_BOT_TOKEN=$TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID
EOF
    chmod 600 "$ENV_FILE"
else
    echo "Einstellungen in $ENV_FILE bleiben unverändert."
fi

say "Dienst einrichten"
install -m 0644 "$CODE_DIR/deploy/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
install -d /etc/systemd/journald.conf.d
install -m 0644 "$CODE_DIR/deploy/journald-memecoin.conf" /etc/systemd/journald.conf.d/memecoin-bot.conf
systemctl restart systemd-journald || true
systemctl daemon-reload
systemctl enable -q "$SERVICE"
systemctl restart "$SERVICE"

say "Selbsttest (dauert ca. 30 Sekunden)"
set +e
(
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    cd "$CODE_DIR"
    runuser -u "$BOT_USER" --preserve-environment -- env MEMECOIN_BOT__RECORDER__DIR="$DATA_DIR/tape" \
        "$APP_DIR/venv/bin/python" -m memecoin_bot doctor --probe-seconds 20
)
status=$?
set -e

say "Fertig"
cat <<EOF
Der Recorder läuft jetzt dauerhaft und startet nach einem Neustart automatisch.

  Status ansehen:   systemctl status $SERVICE
  Live-Log:         journalctl -u $SERVICE -f
  Selbsttest:       sudo $APP_DIR/venv/bin/python -m memecoin_bot doctor   (im Ordner $CODE_DIR)
  Update:           sudo bash $CODE_DIR/deploy/install.sh
  Einstellungen:    sudo nano $ENV_FILE   und danach   sudo systemctl restart $SERVICE
EOF
[ "$status" -eq 0 ] || echo "Hinweis: Der Selbsttest hat Fehler gemeldet – siehe oben und README (Fehlerbehebung)."
