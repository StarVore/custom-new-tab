FROM alpine:3.20

ARG POCKETBASE_VERSION=0.36.7
ARG TARGETOS=linux
ARG TARGETARCH

RUN apk add --no-cache ca-certificates unzip wget \
    && case "$TARGETARCH" in \
        amd64) pb_arch="amd64" ;; \
        arm64) pb_arch="arm64" ;; \
        *) echo "Unsupported architecture: $TARGETARCH" && exit 1 ;; \
    esac \
    && wget -O /tmp/pocketbase.zip \
        "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_${TARGETOS}_${pb_arch}.zip" \
    && unzip /tmp/pocketbase.zip -d /pb \
    && chmod +x /pb/pocketbase \
    && rm -f /tmp/pocketbase.zip

WORKDIR /pb

EXPOSE 8090

ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]