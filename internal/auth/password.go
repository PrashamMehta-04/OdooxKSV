package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

const (
	defaultIterations = 120000
	saltLength        = 16
	hashLength        = 32
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("read salt: %w", err)
	}

	hash := pbkdf2SHA256([]byte(password), salt, defaultIterations, hashLength)
	return strings.Join([]string{
		strconv.Itoa(defaultIterations),
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	}, "$"), nil
}

func VerifyPassword(password, encoded string) error {
	parts := strings.Split(encoded, "$")
	if len(parts) != 3 {
		return errors.New("invalid password hash format")
	}

	iterations, err := strconv.Atoi(parts[0])
	if err != nil || iterations <= 0 {
		return errors.New("invalid password hash iterations")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return fmt.Errorf("decode salt: %w", err)
	}

	expected, err := base64.RawStdEncoding.DecodeString(parts[2])
	if err != nil {
		return fmt.Errorf("decode hash: %w", err)
	}

	actual := pbkdf2SHA256([]byte(password), salt, iterations, len(expected))
	if !constantTimeEqual(actual, expected) {
		return errors.New("invalid credentials")
	}

	return nil
}

func pbkdf2SHA256(password, salt []byte, iterations, keyLen int) []byte {
	hLen := sha256.Size
	numBlocks := (keyLen + hLen - 1) / hLen
	out := make([]byte, 0, numBlocks*hLen)

	for block := 1; block <= numBlocks; block++ {
		// U1 = PRF(password, salt || block)
		saltBlock := make([]byte, len(salt)+4)
		copy(saltBlock, salt)
		saltBlock[len(salt)] = byte(block >> 24)
		saltBlock[len(salt)+1] = byte(block >> 16)
		saltBlock[len(salt)+2] = byte(block >> 8)
		saltBlock[len(salt)+3] = byte(block)
		u := prfSHA256(password, saltBlock)
		t := make([]byte, len(u))
		copy(t, u)

		for i := 1; i < iterations; i++ {
			u = prfSHA256(password, u)
			for j := range t {
				t[j] ^= u[j]
			}
		}

		out = append(out, t...)
	}

	return out[:keyLen]
}

func prfSHA256(key, data []byte) []byte {
	mac := hmac.New(sha256.New, key)
	_, _ = mac.Write(data)
	return mac.Sum(nil)
}

func constantTimeEqual(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	var v byte
	for i := range a {
		v |= a[i] ^ b[i]
	}
	return v == 0
}
