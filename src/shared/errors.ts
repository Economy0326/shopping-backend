export const ERR = {
  // auth
  AUTH_EMAIL_EXISTS: { code: "AUTH_EMAIL_EXISTS", message: "이미 가입된 이메일입니다" },
  AUTH_INVALID_CREDENTIALS: { code: "AUTH_INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다" },
  AUTH_REQUIRED: { code: "AUTH_REQUIRED", message: "로그인이 필요합니다" },
  AUTH_REFRESH_MISSING: { code: "AUTH_REFRESH_MISSING", message: "리프레시 토큰이 없습니다" },
  AUTH_REFRESH_INVALID: { code: "AUTH_REFRESH_INVALID", message: "리프레시 토큰이 유효하지 않습니다" },

  // common
  NOT_FOUND: { code: "NOT_FOUND", message: "리소스를 찾을 수 없습니다" },
  FORBIDDEN: { code: "FORBIDDEN", message: "권한이 없습니다" },

  // products/variants
  INVALID_VARIANT: { code: "INVALID_VARIANT", message: "요청한 variant가 올바르지 않습니다" },
  VARIANT_NOT_FOUND: { code: "VARIANT_NOT_FOUND", message: "variant를 찾을 수 없습니다" },

  // orders
  OUT_OF_STOCK: { code: "OUT_OF_STOCK", message: "재고가 부족합니다" },
  INVALID_ORDER_STATUS: { code: "INVALID_ORDER_STATUS", message: "주문 상태가 올바르지 않습니다" },
  ORDER_NOT_FOUND: { code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다" },

  // returns
  RETURN_NOT_ALLOWED: { code: "RETURN_NOT_ALLOWED", message: "반품 요청이 불가능한 상태입니다" },
  RETURN_ALREADY_EXISTS: { code: "RETURN_ALREADY_EXISTS", message: "이미 반품 요청이 존재합니다" },

  // admin
  ADMIN_ONLY: { code: "ADMIN_ONLY", message: "관리자 권한이 필요합니다" },
} as const;