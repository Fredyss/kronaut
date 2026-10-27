#!/bin/sh
set -eu

HELPER_IMAGE=alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6
POSTGRES_UID=70
KRONAUT_UID=65532

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
dir=${1:-$root/secrets}

umask 077
mkdir -p "$dir"
chmod 700 "$dir"
dir=$(CDPATH='' cd -- "$dir" && pwd)

exists() {
  [ -e "$dir/$1" ]
}

write() {
  printf '%s\n' "$2" > "$dir/$1"
  echo "created $1"
}

hex() {
  openssl rand -hex "$1"
}

base64_unpadded() {
  openssl rand -base64 "$1" | tr -d '\n='
}

uuid() {
  hex 16 | sed -E 's/^(.{8})(.{4}).(.{3}).(.{3})(.{12})$/\1-\2-4\3-a\4-\5/'
}

login() {
  password_file=$1
  url_file=$2
  user=$3
  if exists "$password_file" && exists "$url_file"; then
    echo "kept $password_file and $url_file"
    return
  fi
  if exists "$password_file" || exists "$url_file"; then
    echo "error: $password_file and $url_file must be created together; delete the one that exists and rerun" >&2
    exit 1
  fi
  password=$(hex 32)
  write "$password_file" "$password"
  write "$url_file" "postgres://$user:$password@postgres:5432/kronaut"
}

single() {
  if exists "$1"; then
    echo "kept $1"
  else
    write "$1" "$2"
  fi
}

login postgres_password migration_database_url kronaut
login postgres_app_password database_url kronaut_app_login
login postgres_operator_password operator_database_url kronaut_operator_login
single instance_id "$(uuid)"
single kronaut_secret "$(base64_unpadded 32)"
single kek_1 "$(base64_unpadded 32)"
if ! exists backup_recipient; then
  : > "$dir/backup_recipient"
  echo "created backup_recipient (empty)"
fi
if ! exists smtp_password; then
  : > "$dir/smtp_password"
  echo "created smtp_password (empty)"
fi

if [ "$(uname -s)" = Linux ]; then
  docker run --rm --network none -v "$dir:/s" "$HELPER_IMAGE" sh -eu -c '
    cd /s
    for f in *; do
      case "$f" in
        postgres_*) chown "$1:$1" "$f" ;;
        *) chown "$2:$2" "$f" ;;
      esac
      chmod 0400 "$f"
    done
  ' sh "$POSTGRES_UID" "$KRONAUT_UID"
else
  chmod 0400 "$dir"/*
fi

if ! exists cloudflared_token; then
  rerun="sh $0"
  [ $# -gt 0 ] && rerun="$rerun $1"
  cat <<EOF

Next: paste the Cloudflare tunnel token (end with Ctrl-D), then rerun this script
to set its owner and mode:
  (umask 077; cat > '$dir/cloudflared_token')
  $rerun
EOF
fi
