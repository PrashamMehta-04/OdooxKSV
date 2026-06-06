FROM golang:1.26.1-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates git

COPY go.mod ./
COPY . .

RUN go build -o /out/vendorbridge ./cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates && addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=builder /out/vendorbridge /usr/local/bin/vendorbridge
COPY --from=builder /src/migrations ./migrations

EXPOSE 8080

USER app

ENTRYPOINT ["vendorbridge"]
