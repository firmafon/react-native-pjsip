#!/bin/bash
set -e

VERSION="v3.5"
URL="https://cdn.rela.tel/www/public/phon/pjsip-3.5.tar.gz"
LOCK=".libs.lock"
DEST=".libs.tar.gz"
DOWNLOAD=true

if ! type "curl" > /dev/null; then
    echo "Missed curl dependency" >&2;
    exit 1;
fi
if ! type "tar" > /dev/null; then
    echo "Missed tar dependency" >&2;
    exit 1;
fi

if [ -f ${LOCK} ]; then
    CURRENT_VERSION=$(cat ${LOCK})

    if [ "${CURRENT_VERSION}" == "${VERSION}" ];then
        DOWNLOAD=false
    fi
fi

if [ "$DOWNLOAD" = true ]; then
    curl -L --silent "${URL}" -o "${DEST}"
    tar -xvf "${DEST}"
    rm -f "${DEST}"

    echo "${VERSION}" > ${LOCK}
fi
