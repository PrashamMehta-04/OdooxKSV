package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"vendorbridge/internal/auth"
	"vendorbridge/internal/domain"
	"vendorbridge/internal/store"
)

type Server struct {
	logger *slog.Logger
	store  *store.Store
	tokens *auth.TokenManager
}

type contextKey string

const authClaimsKey contextKey = "auth_claims"

func New(logger *slog.Logger, st *store.Store, authSecret string) *Server {
	return &Server{
		logger: logger,
		store:  st,
		tokens: auth.NewTokenManager(authSecret),
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(s.requestLogger)
	r.Use(chiMiddleware.Recoverer)

	r.Get("/", s.root)
	r.Get("/healthz", s.healthz)
	r.Get("/readyz", s.readyz)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/auth/register", s.handleRegister)
		r.Post("/auth/login", s.handleLogin)
		r.Get("/auth/me", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, nil, s.handleMe)
		})
		r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleDashboard)
		})
		r.Get("/vendors", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListVendors)
		})
		r.Post("/vendors", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), s.handleCreateVendor)
		})
		r.Get("/vendors/{id}", s.handleGetVendor)
		r.Patch("/vendors/{id}", s.handleUpdateVendor)
		r.Delete("/vendors/{id}", s.handleDeleteVendor)
		r.Get("/rfqs", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListRFQs)
		})
		r.Post("/rfqs", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), s.handleCreateRFQ)
		})
		r.Get("/rfqs/{id}", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleGetRFQ)
		})
		r.Post("/rfqs/{id}/line-items", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), s.handleAddRFQLineItems)
		})
		r.Post("/rfqs/{id}/vendors", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), s.handleAssignRFQVendors)
		})
		r.Post("/rfqs/{id}/attachments", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), s.handleAddRFQAttachments)
		})
		r.Get("/rfqs/{id}/quotations", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListQuotationsByRFQ)
		})
		r.Get("/quotations", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListQuotations)
		})
		r.Get("/quotations/{id}", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleGetQuotation)
		})
		r.Post("/rfqs/{id}/quotations", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "vendor"), s.handleCreateQuotation)
		})
		r.Post("/quotations/{id}/select", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), s.handleSelectQuotation)
		})
		r.Get("/approvals", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListApprovals)
		})
		r.Get("/approvals/{id}", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleGetApproval)
		})
		r.Post("/approvals/{id}/decide", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "officer", "finance_manager", "procurement_head"), s.handleDecideApproval)
		})
		r.Get("/purchase-orders", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListPurchaseOrders)
		})
		r.Get("/purchase-orders/{id}", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleGetPurchaseOrder)
		})
		r.Get("/invoices", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListInvoices)
		})
		r.Get("/invoices/{id}", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleGetInvoice)
		})
		r.Post("/invoices/{id}/send", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRoles("admin", "finance_manager", "procurement_head"), s.handleSendInvoice)
		})
		r.Get("/activity", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleListActivity)
		})
		r.Get("/reports/spend-trend", func(w http.ResponseWriter, r *http.Request) {
			s.withAuth(w, r, allowedRolesAny(), s.handleSpendTrend)
		})
	})

	return r
}

func (s *Server) root(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"service": "vendorbridge",
		"status":  "running",
	})
}

func (s *Server) healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
	})
}

func (s *Server) readyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := s.store.DB().PingContext(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"status": "not ready",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ready",
	})
}

type authContext struct {
	Claims domain.AuthClaims
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := chiMiddleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(wrapped, r)
		s.logger.Info("http request",
			"request_id", chiMiddleware.GetReqID(r.Context()),
			"method", r.Method,
			"path", r.URL.Path,
			"status", wrapped.Status(),
			"bytes", wrapped.BytesWritten(),
			"duration", time.Since(start).String(),
		)
	})
}

func (s *Server) withAuth(w http.ResponseWriter, r *http.Request, allowed map[string]struct{}, fn func(http.ResponseWriter, *http.Request, authContext)) {
	claims, err := s.authenticate(r)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if len(allowed) > 0 {
		if _, ok := allowed[strings.ToLower(claims.Role)]; !ok {
			respondError(w, http.StatusForbidden, "insufficient role")
			return
		}
	}
	ctx := context.WithValue(r.Context(), authClaimsKey, claims)
	fn(w, r.WithContext(ctx), authContext{Claims: claims})
}

func (s *Server) authenticate(r *http.Request) (domain.AuthClaims, error) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return domain.AuthClaims{}, errors.New("missing authorization header")
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return domain.AuthClaims{}, errors.New("invalid authorization header")
	}
	return s.tokens.Verify(strings.TrimPrefix(header, prefix))
}

func allowedRoles(roles ...string) map[string]struct{} {
	set := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		set[strings.ToLower(role)] = struct{}{}
	}
	return set
}

func allowedRolesAny() map[string]struct{} {
	return nil
}

func currentClaims(r *http.Request) domain.AuthClaims {
	if claims, ok := r.Context().Value(authClaimsKey).(domain.AuthClaims); ok {
		return claims
	}
	return domain.AuthClaims{}
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.Password == "" || req.Email == "" || req.FullName == "" {
		respondError(w, http.StatusBadRequest, "full_name, email, and password are required")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	role := strings.ToLower(strings.TrimSpace(req.Role))
	if role == "" {
		role = "officer"
	}
	user, err := s.store.CreateUser(r.Context(), store.CreateUserParams{
		FullName:       req.FullName,
		Email:          strings.ToLower(strings.TrimSpace(req.Email)),
		PasswordHash:   hash,
		Role:           role,
		Country:        req.Country,
		PhoneNumber:    req.PhoneNumber,
		PhotoURL:       req.PhotoURL,
		AdditionalInfo: req.AdditionalInfo,
	})
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	token, err := s.tokens.Issue(user.ID, user.Role)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"user":  user,
		"token": token,
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	user, passwordHash, err := s.store.GetUserByEmail(r.Context(), strings.ToLower(strings.TrimSpace(req.Email)))
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := auth.VerifyPassword(req.Password, passwordHash); err != nil {
		respondError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := s.tokens.Issue(user.ID, user.Role)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user":  user,
		"token": token,
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request, ac authContext) {
	user, err := s.store.GetUserByID(r.Context(), ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request, ac authContext) {
	metrics, err := s.store.GetDashboardMetrics(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	trend, err := s.store.GetSpendTrend(r.Context(), parseIntQuery(r, "months", 6))
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"metrics": metrics,
		"trend":   trend,
	})
}

func (s *Server) handleListVendors(w http.ResponseWriter, r *http.Request, ac authContext) {
	vendors, err := s.store.ListVendors(r.Context(), store.VendorFilters{
		Search: r.URL.Query().Get("search"),
		Status: r.URL.Query().Get("status"),
		Limit:  parseIntQuery(r, "limit", 50),
		Offset: parseIntQuery(r, "offset", 0),
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, vendors)
}

func (s *Server) handleCreateVendor(w http.ResponseWriter, r *http.Request, ac authContext) {
	var req vendorRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	vendor, err := s.store.CreateVendor(r.Context(), store.CreateVendorParams{
		Name:          req.Name,
		GSTNumber:     req.GSTNumber,
		Category:      req.Category,
		ContactNumber: req.ContactNumber,
		Email:         req.Email,
		Country:       req.Country,
		Status:        req.Status,
		Notes:         req.Notes,
	}, ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, vendor)
}

func (s *Server) handleVendorByID(w http.ResponseWriter, r *http.Request, id string) {
	id = chi.URLParam(r, "id")
	if id == "" {
		http.NotFound(w, r)
		return
	}
	switch r.Method {
	case http.MethodGet:
		s.withAuth(w, r, allowedRolesAny(), func(w http.ResponseWriter, r *http.Request, ac authContext) {
			vendor, err := s.store.GetVendor(r.Context(), id)
			if err != nil {
				respondError(w, http.StatusNotFound, "vendor not found")
				return
			}
			writeJSON(w, http.StatusOK, vendor)
		})
	case http.MethodPatch:
		s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), func(w http.ResponseWriter, r *http.Request, ac authContext) {
			var req vendorRequest
			if err := decodeJSON(r, &req); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			vendor, err := s.store.UpdateVendor(r.Context(), id, store.UpdateVendorParams{
				Name:          req.Name,
				GSTNumber:     req.GSTNumber,
				Category:      req.Category,
				ContactNumber: req.ContactNumber,
				Email:         req.Email,
				Country:       req.Country,
				Status:        req.Status,
				Notes:         req.Notes,
			}, ac.Claims.UserID)
			if err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, vendor)
		})
	case http.MethodDelete:
		s.withAuth(w, r, allowedRoles("admin", "procurement_head"), func(w http.ResponseWriter, r *http.Request, ac authContext) {
			if err := s.store.DeleteVendor(r.Context(), id, ac.Claims.UserID); err != nil {
				respondError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
		})
	default:
		respondMethodNotAllowed(w)
	}
}

func (s *Server) handleGetVendor(w http.ResponseWriter, r *http.Request) {
	s.withAuth(w, r, nil, func(w http.ResponseWriter, r *http.Request, ac authContext) {
		vendor, err := s.store.GetVendor(r.Context(), chi.URLParam(r, "id"))
		if err != nil {
			respondError(w, http.StatusNotFound, "vendor not found")
			return
		}
		writeJSON(w, http.StatusOK, vendor)
	})
}

func (s *Server) handleUpdateVendor(w http.ResponseWriter, r *http.Request) {
	s.withAuth(w, r, allowedRoles("admin", "officer", "procurement_head"), func(w http.ResponseWriter, r *http.Request, ac authContext) {
		var req vendorRequest
		if err := decodeJSON(r, &req); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		vendor, err := s.store.UpdateVendor(r.Context(), chi.URLParam(r, "id"), store.UpdateVendorParams{
			Name:          req.Name,
			GSTNumber:     req.GSTNumber,
			Category:      req.Category,
			ContactNumber: req.ContactNumber,
			Email:         req.Email,
			Country:       req.Country,
			Status:        req.Status,
			Notes:         req.Notes,
		}, ac.Claims.UserID)
		if err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, vendor)
	})
}

func (s *Server) handleDeleteVendor(w http.ResponseWriter, r *http.Request) {
	s.withAuth(w, r, allowedRoles("admin", "procurement_head"), func(w http.ResponseWriter, r *http.Request, ac authContext) {
		if err := s.store.DeleteVendor(r.Context(), chi.URLParam(r, "id"), ac.Claims.UserID); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
	})
}

func (s *Server) handleListRFQs(w http.ResponseWriter, r *http.Request, ac authContext) {
	filters := store.RFQFilters{
		Search: r.URL.Query().Get("search"),
		Status: r.URL.Query().Get("status"),
		Limit:  parseIntQuery(r, "limit", 50),
		Offset: parseIntQuery(r, "offset", 0),
	}

	if strings.ToLower(ac.Claims.Role) == "vendor" {
		user, err := s.store.GetUserByID(r.Context(), ac.Claims.UserID)
		if err == nil {
			vendor, err := s.store.GetVendorByEmail(r.Context(), user.Email)
			if err == nil {
				filters.VendorID = vendor.ID
			}
		}
	}

	rfqs, err := s.store.ListRFQs(r.Context(), filters)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rfqs)
}

func (s *Server) handleCreateRFQ(w http.ResponseWriter, r *http.Request, ac authContext) {
	var req rfqRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	rfq, err := s.store.CreateRFQ(r.Context(), store.RFQCreateRequest{
		Title:       req.Title,
		Description: req.Description,
		Category:    req.Category,
		Deadline:    req.Deadline,
		Status:      req.Status,
		CreatedBy:   ac.Claims.UserID,
		LineItems:   req.LineItems,
		VendorIDs:   req.VendorIDs,
		Attachments: req.Attachments,
	}, ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, rfq)
}

func (s *Server) handleGetRFQ(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	rfq, items, attachments, vendors, err := s.store.GetRFQ(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "rfq not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"rfq":         rfq,
		"line_items":  items,
		"attachments": attachments,
		"vendors":     vendors,
	})
}

func (s *Server) handleAddRFQLineItems(w http.ResponseWriter, r *http.Request, ac authContext) {
	rfqID := chi.URLParam(r, "id")
	var req struct {
		Items []store.RFQLineItemInput `json:"items"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.store.AddRFQLineItems(r.Context(), rfqID, req.Items, ac.Claims.UserID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleAssignRFQVendors(w http.ResponseWriter, r *http.Request, ac authContext) {
	rfqID := chi.URLParam(r, "id")
	var req struct {
		VendorIDs []string `json:"vendor_ids"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.store.AssignRFQVendors(r.Context(), rfqID, req.VendorIDs, ac.Claims.UserID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleAddRFQAttachments(w http.ResponseWriter, r *http.Request, ac authContext) {
	rfqID := chi.URLParam(r, "id")
	var req struct {
		Attachments []store.RFQAttachmentInput `json:"attachments"`
	}
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.store.AddRFQAttachments(r.Context(), rfqID, req.Attachments, ac.Claims.UserID); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListQuotationsByRFQ(w http.ResponseWriter, r *http.Request, ac authContext) {
	rfqID := chi.URLParam(r, "id")
	quotations, err := s.store.ListQuotations(r.Context(), store.QuotationFilters{
		RFQID:  rfqID,
		Status: r.URL.Query().Get("status"),
		Limit:  parseIntQuery(r, "limit", 50),
		Offset: parseIntQuery(r, "offset", 0),
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, quotations)
}

func (s *Server) handleCreateQuotation(w http.ResponseWriter, r *http.Request, ac authContext) {
	rfqID := chi.URLParam(r, "id")
	var req quotationRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	quotation, err := s.store.CreateQuotation(r.Context(), store.CreateQuotationRequest{
		RFQID:        rfqID,
		VendorID:     req.VendorID,
		TotalAmount:  req.TotalAmount,
		DeliveryDays: req.DeliveryDays,
		Rating:       req.Rating,
		PaymentTerms: req.PaymentTerms,
		GSTPercent:   req.GSTPercent,
		Status:       req.Status,
		Selected:     req.Selected,
		LineItems:    req.LineItems,
	}, ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, quotation)
}

func (s *Server) handleListQuotations(w http.ResponseWriter, r *http.Request, ac authContext) {
	filters := store.QuotationFilters{
		RFQID:  r.URL.Query().Get("rfq_id"),
		Status: r.URL.Query().Get("status"),
		Limit:  parseIntQuery(r, "limit", 50),
		Offset: parseIntQuery(r, "offset", 0),
	}

	if strings.ToLower(ac.Claims.Role) == "vendor" {
		user, err := s.store.GetUserByID(r.Context(), ac.Claims.UserID)
		if err == nil {
			vendor, err := s.store.GetVendorByEmail(r.Context(), user.Email)
			if err == nil {
				filters.VendorID = vendor.ID
			}
		}
	}

	quotations, err := s.store.ListQuotations(r.Context(), filters)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, quotations)
}

func (s *Server) handleGetQuotation(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	q, items, err := s.store.GetQuotation(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "quotation not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"quotation": q,
		"items":     items,
	})
}

func (s *Server) handleSelectQuotation(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	quotation, err := s.store.SelectQuotation(r.Context(), id, ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, quotation)
}

func (s *Server) handleListApprovals(w http.ResponseWriter, r *http.Request, ac authContext) {
	approvals, err := s.store.ListApprovals(r.Context(), r.URL.Query().Get("status"), parseIntQuery(r, "limit", 50), parseIntQuery(r, "offset", 0))
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, approvals)
}

func (s *Server) handleGetApproval(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	approval, err := s.store.GetApproval(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "approval not found")
		return
	}
	writeJSON(w, http.StatusOK, approval)
}

func (s *Server) handleDecideApproval(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	var req approvalDecisionRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "approved" && status != "rejected" {
		respondError(w, http.StatusBadRequest, "status must be approved or rejected")
		return
	}
	approval, po, invoice, err := s.store.DecideApproval(r.Context(), id, ac.Claims.UserID, store.ApprovalDecisionRequest{
		Status:  status,
		Remarks: req.Remarks,
	}, ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	response := map[string]any{"approval": approval}
	if po != nil {
		response["purchase_order"] = po
	}
	if invoice != nil {
		response["invoice"] = invoice
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) handleListPurchaseOrders(w http.ResponseWriter, r *http.Request, ac authContext) {
	limit := parseIntQuery(r, "limit", 50)
	offset := parseIntQuery(r, "offset", 0)
	var vendorID string

	if strings.ToLower(ac.Claims.Role) == "vendor" {
		user, err := s.store.GetUserByID(r.Context(), ac.Claims.UserID)
		if err == nil {
			vendor, err := s.store.GetVendorByEmail(r.Context(), user.Email)
			if err == nil {
				vendorID = vendor.ID
			}
		}
	}

	items, err := s.store.ListPurchaseOrders(r.Context(), vendorID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleGetPurchaseOrder(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	po, items, err := s.store.GetPurchaseOrder(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "purchase order not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"purchase_order": po, "items": items})
}

func (s *Server) handleListInvoices(w http.ResponseWriter, r *http.Request, ac authContext) {
	limit := parseIntQuery(r, "limit", 50)
	offset := parseIntQuery(r, "offset", 0)
	var vendorID string

	if strings.ToLower(ac.Claims.Role) == "vendor" {
		user, err := s.store.GetUserByID(r.Context(), ac.Claims.UserID)
		if err == nil {
			vendor, err := s.store.GetVendorByEmail(r.Context(), user.Email)
			if err == nil {
				vendorID = vendor.ID
			}
		}
	}

	items, err := s.store.ListInvoices(r.Context(), vendorID, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleGetInvoice(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	invoice, items, err := s.store.GetInvoice(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "invoice not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"invoice": invoice, "items": items})
}

func (s *Server) handleSendInvoice(w http.ResponseWriter, r *http.Request, ac authContext) {
	id := chi.URLParam(r, "id")
	invoice, err := s.store.MarkInvoiceSent(r.Context(), id, ac.Claims.UserID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, invoice)
}

func (s *Server) handleListActivity(w http.ResponseWriter, r *http.Request, ac authContext) {
	items, err := s.store.ListActivity(r.Context(), parseIntQuery(r, "limit", 100), parseIntQuery(r, "offset", 0))
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleSpendTrend(w http.ResponseWriter, r *http.Request, ac authContext) {
	items, err := s.store.GetSpendTrend(r.Context(), parseIntQuery(r, "months", 6))
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, items)
}

type registerRequest struct {
	FullName       string `json:"full_name"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	Role           string `json:"role"`
	Country        string `json:"country"`
	PhoneNumber    string `json:"phone_number"`
	PhotoURL       string `json:"photo_url"`
	AdditionalInfo string `json:"additional_info"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type vendorRequest struct {
	Name          string `json:"name"`
	GSTNumber     string `json:"gst_number"`
	Category      string `json:"category"`
	ContactNumber string `json:"contact_number"`
	Email         string `json:"email"`
	Country       string `json:"country"`
	Status        string `json:"status"`
	Notes         string `json:"notes"`
}

type rfqRequest struct {
	Title       string                     `json:"title"`
	Description string                     `json:"description"`
	Category    string                     `json:"category"`
	Deadline    *string                    `json:"deadline"`
	Status      string                     `json:"status"`
	LineItems   []store.RFQLineItemInput   `json:"line_items"`
	VendorIDs   []string                   `json:"vendor_ids"`
	Attachments []store.RFQAttachmentInput `json:"attachments"`
}

type quotationRequest struct {
	VendorID     string                         `json:"vendor_id"`
	TotalAmount  float64                        `json:"total_amount"`
	DeliveryDays int                            `json:"delivery_days"`
	Rating       float64                        `json:"rating"`
	PaymentTerms string                         `json:"payment_terms"`
	GSTPercent   float64                        `json:"gst_percent"`
	Status       string                         `json:"status"`
	Selected     bool                           `json:"selected"`
	LineItems    []store.QuotationLineItemInput `json:"line_items"`
}

type approvalDecisionRequest struct {
	Status  string `json:"status"`
	Remarks string `json:"remarks"`
}

func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func respondMethodNotAllowed(w http.ResponseWriter) {
	respondError(w, http.StatusMethodNotAllowed, "method not allowed")
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	n, err := strconv.Atoi(value)
	if err != nil || n < 0 {
		return fallback
	}
	return n
}

func firstSegment(value string) string {
	value = strings.Trim(value, "/")
	if value == "" {
		return ""
	}
	parts := strings.Split(value, "/")
	return parts[0]
}
