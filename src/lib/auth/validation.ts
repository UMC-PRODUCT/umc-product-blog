export type ValidationResult = {
  valid: boolean;
  message?: string;
};

export function validateEmail(value: string): ValidationResult {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? { valid: true }
    : { valid: false, message: '올바른 이메일 형식을 입력해 주세요.' };
}

export function validateLoginId(value: string): ValidationResult {
  if (value.length < 5) {
    return { valid: false, message: '아이디는 5자 이상이어야 합니다.' };
  }

  if (value.length > 20) {
    return { valid: false, message: '아이디는 20자 이하여야 합니다.' };
  }

  return /^[a-z0-9_-]*$/.test(value)
    ? { valid: true }
    : { valid: false, message: '5~20자의 영문, 숫자와 특수기호(_),(-)만 사용할 수 있습니다.' };
}

export function validatePassword(value: string): ValidationResult {
  if (value.length < 8 || value.length > 16) {
    return { valid: false, message: '비밀번호는 8자 이상 16자 이하여야 합니다.' };
  }

  if (!/^[a-zA-Z0-9!#$&*@?]*$/.test(value)) {
    return { valid: false, message: '사용 가능한 특수문자는 !#$&*@? 입니다.' };
  }

  const typeCount = [/[a-zA-Z]/.test(value), /[0-9]/.test(value), /[!#$&*@?]/.test(value)].filter(
    Boolean,
  ).length;

  return typeCount >= 2
    ? { valid: true }
    : { valid: false, message: '영문, 숫자, 특수문자 중 2종류 이상 포함해야 합니다.' };
}

export function validateNickname(value: string): ValidationResult {
  return /^[가-힣]{1,5}$/.test(value)
    ? { valid: true }
    : { valid: false, message: '닉네임은 공백 없이 한글 1-5자로 입력해 주세요.' };
}

export function validateVerificationCode(value: string): ValidationResult {
  return /^\d{6}$/.test(value)
    ? { valid: true }
    : { valid: false, message: '인증번호 6자리를 입력해 주세요.' };
}
