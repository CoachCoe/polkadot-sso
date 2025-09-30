global.fetch = jest.fn()

global.crypto = {
  getRandomValues: jest.fn().mockImplementation((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  })
} as any

jest.mock('@polkadot/extension-dapp', () => ({
  web3Enable: jest.fn().mockResolvedValue([
    {
      name: 'polkadot-js',
      version: '0.44.1',
      accounts: {
        subscribe: jest.fn(),
        get: jest.fn()
      },
      signer: {
        signRaw: jest.fn()
      }
    }
  ]),
  web3Accounts: jest.fn().mockResolvedValue([
    {
      address: '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z',
      meta: {
        name: 'Test Account',
        source: 'polkadot-js'
      }
    }
  ]),
  web3FromAddress: jest.fn().mockResolvedValue({
    signer: {
      signRaw: jest.fn().mockResolvedValue({
        signature: '0x1234567890abcdef'
      })
    }
  })
}))