
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'location', {
    value: {
      href: '',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    },
    writable: true,
  });

  Object.defineProperty(window, 'addEventListener', {
    value: jest.fn(),
    writable: true,
  });

  Object.defineProperty(window, 'removeEventListener', {
    value: jest.fn(),
    writable: true,
  });
}
