package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"vendorbridge/internal/domain"
)

const defaultTokenTTL = 24 * time.Hour

type TokenManager struct {
	secret []byte
	ttl    time.Duration
}

func NewTokenManager(secret string) *TokenManager {
	if secret == "" {
		secret = "vendorbridge-dev-secret-change-me"
	}

	return &TokenManager{
		secret: []byte(secret),
		ttl:    defaultTokenTTL,
	}
}

func (m *TokenManager) Issue(userID, role string) (string, error) {
	now := time.Now().UTC()
	claims := domain.AuthClaims{
		UserID:    userID,
		Role:      role,
		IssuedAt:  now,
		ExpiresAt: now.Add(m.ttl),
	}

	payload, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("marshal claims: %w", err)
	}

	token := base64.RawURLEncoding.EncodeToString(payload)
	sig := m.sign([]byte(token))
	return token + "." + base64.RawURLEncoding.EncodeToString(sig), nil
}

func (m *TokenManager) Verify(token string) (domain.AuthClaims, error) {
	var claims domain.AuthClaims

	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return claims, errors.New("invalid token")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return claims, fmt.Errorf("decode token payload: %w", err)
	}

	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return claims, fmt.Errorf("decode token signature: %w", err)
	}

	if !hmac.Equal(sig, m.sign([]byte(parts[0]))) {
		return claims, errors.New("invalid token signature")
	}

	if err := json.Unmarshal(payload, &claims); err != nil {
		return claims, fmt.Errorf("unmarshal claims: %w", err)
	}

	if time.Now().UTC().After(claims.ExpiresAt) {
		return claims, errors.New("token expired")
	}

	return claims, nil
}

func (m *TokenManager) sign(payload []byte) []byte {
	mac := hmac.New(sha256.New, m.secret)
	mac.Write(payload)
	return mac.Sum(nil)
}

func RandomToken(n int) (string, error) {
	if n <= 0 {
		n = 32
	}
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
