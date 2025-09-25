export default defineAppConfig({
  github: {
    rootDir: 'apps/docs',
  },
  header: {
    title: "Polkadot Auth",
    logo: {
      light: 'polkadot.svg',
      dark: 'polkadot-white.svg',
      alt: 'Polkadot Logo'
    }
  },
  ui: {
    colors: {
      primary: 'pink',
      gray: 'neutral'
    }
  }
});
