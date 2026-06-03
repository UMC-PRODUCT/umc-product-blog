export const REGISTER_REQUIRED_NOTICE = {
  title: '앗, 아직 UMC 회원이 아니에요',
  description: '여기는 글만 저장하는 곳이에요!\n회원가입은 UMC 홈페이지에서 할 수 있어요.',
  type: 'confirm' as const,
  primaryLabel: '회원가입 하러가기',
  primaryHref: 'https://university.neordinary.com/signup',
  secondaryLabel: '닫기',
};

export const REGISTER_REQUIRED_CLOSE_ATTRS = {
  'data-action-modal-close': true,
  'data-register-required-close': true,
};

export const REGISTER_REQUIRED_LOGIN_MODAL_CLOSE_ATTRS = {
  ...REGISTER_REQUIRED_CLOSE_ATTRS,
  'data-login-modal-close': true,
};
