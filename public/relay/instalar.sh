#!/usr/bin/env bash
# Instala o repetidor do Xtreamy numa máquina Ubuntu (ex.: Oracle Cloud Always Free).
# Uso (na máquina, como usuário com sudo):
#   curl -fsSL https://SEU-XTREAMY/relay/instalar.sh | sudo bash -s -- https://SEU-XTREAMY
# No fim ele mostra RELAY_URL e RELAY_SECRET para colocar na Vercel.
set -euo pipefail

ORIGEM="${1:-}"
if [ -z "$ORIGEM" ]; then
  echo "Informe o endereço do Xtreamy. Ex.: sudo bash instalar.sh https://xtreamy.vercel.app" >&2
  exit 1
fi
ORIGEM="${ORIGEM%/}"
PASTA=/opt/xtreamy-relay

echo "==> Instalando ffmpeg, Node.js e Caddy (HTTPS automático)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ffmpeg curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent
if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> Baixando o repetidor…"
mkdir -p "$PASTA"
curl -fsSL "$ORIGEM/relay/servidor.mjs" -o "$PASTA/servidor.mjs"
curl -fsSL "$ORIGEM/relay/package.json" -o "$PASTA/package.json"
(cd "$PASTA" && npm install --omit=dev --no-audit --no-fund)

# Segredo compartilhado com a Vercel (gerado uma vez; reinstalar mantém o mesmo).
if [ ! -f "$PASTA/segredo" ]; then
  openssl rand -base64 32 > "$PASTA/segredo"
  chmod 600 "$PASTA/segredo"
fi
SEGREDO="$(cat "$PASTA/segredo")"

# Endereço com HTTPS sem comprar domínio: sslip.io aponta o nome para o IP da máquina.
IP="$(curl -fsS https://api.ipify.org)"
DOMINIO="$(echo "$IP" | tr . -).sslip.io"

echo "==> Configurando o serviço…"
id -u xtreamy >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin xtreamy
chown -R xtreamy "$PASTA"
cat > /etc/systemd/system/xtreamy-relay.service <<EOF
[Unit]
Description=Repetidor do Xtreamy
After=network-online.target

[Service]
User=xtreamy
WorkingDirectory=$PASTA
Environment=RELAY_SECRET=$SEGREDO
Environment=PORTA=8080
ExecStart=/usr/bin/node $PASTA/servidor.mjs
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/caddy/Caddyfile <<EOF
$DOMINIO {
  reverse_proxy 127.0.0.1:8080
}
EOF

echo "==> Liberando as portas 80 e 443 no firewall da máquina…"
for PORTA in 80 443; do
  iptables -C INPUT -p tcp --dport "$PORTA" -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport "$PORTA" -j ACCEPT
done
netfilter-persistent save >/dev/null 2>&1 || true

systemctl daemon-reload
systemctl enable --now xtreamy-relay
systemctl restart xtreamy-relay
systemctl restart caddy

echo
echo "============================================================"
echo " Pronto. Coloque estas duas variáveis na Vercel (Settings →"
echo " Environment Variables, ambiente Production) e faça Redeploy:"
echo
echo "   RELAY_URL=wss://$DOMINIO"
echo "   RELAY_SECRET=$SEGREDO"
echo
echo " Para conferir: abra https://$DOMINIO no navegador."
echo " (Precisa liberar as portas 80 e 443 também no painel da Oracle.)"
echo "============================================================"
