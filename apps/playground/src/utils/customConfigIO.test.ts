import type { TCustomAssetsMap } from '@paraspell/sdk';
import { describe, expect, it } from 'vitest';

import type { TStoredCustomChains } from '../types/TCustomChain';
import { buildCustomConfig, parseCustomConfig } from './customConfigIO';

describe('customConfigIO', () => {
  describe('parseCustomConfig', () => {
    it('throws error for invalid JSON text', () => {
      expect(() => parseCustomConfig('{ not json }')).toThrow('File is not valid JSON.');
    });

    it('throws error if top-level is not an object', () => {
      expect(() => parseCustomConfig('["not", "an", "object"]')).toThrow('Config must be a JSON object.');
    });

    it('throws error if customChains is not an object', () => {
      expect(() => parseCustomConfig(JSON.stringify({ customChains: [] }))).toThrow(
        '"customChains" must be an object.',
      );
    });

    it('throws error if customAssets is not an object', () => {
      expect(() => parseCustomConfig(JSON.stringify({ customAssets: 'string' }))).toThrow(
        '"customAssets" must be an object.',
      );
    });

    it('throws error if neither customChains nor customAssets is present', () => {
      expect(() => parseCustomConfig(JSON.stringify({ version: 1 }))).toThrow(
        'Config must contain "customChains" and/or "customAssets".',
      );
    });

    it('rejects malformed customChains with null entry', () => {
      expect(() =>
        parseCustomConfig(JSON.stringify({ customChains: { EvilChain: null } })),
      ).toThrow('Invalid customChain entry for "EvilChain". Must be an object.');
    });

    it('rejects customChains missing input or assetsInfo', () => {
      expect(() =>
        parseCustomConfig(
          JSON.stringify({
            customChains: {
              IncompleteChain: { input: {} },
            },
          }),
        ),
      ).toThrow('Invalid customChain entry for "IncompleteChain". "assetsInfo" must be an object.');
    });

    it('rejects customAssets where a chain entry is not an array', () => {
      expect(() =>
        parseCustomConfig(
          JSON.stringify({
            customAssets: {
              AssetHubPolkadot: 'DOTDOTDOT',
            },
          }),
        ),
      ).toThrow('"customAssets" for "AssetHubPolkadot" must be an array.');
    });

    it('rejects customAssets with mistyped asset fields', () => {
      expect(() =>
        parseCustomConfig(
          JSON.stringify({
            customAssets: {
              AssetHubPolkadot: [
                {
                  symbol: 'DOT',
                  decimals: 'ten',
                  location: null,
                  existentialDeposit: 12345,
                },
              ],
            },
          }),
        ),
      ).toThrow('decimals');
    });

    it('accepts valid custom config with customChains and customAssets', () => {
      const validConfig = {
        version: 1,
        customChains: {
          MyChain: {
            input: {
              paraId: 1000,
              ecosystem: 'Polkadot',
              providers: [{ name: 'Test', endpoint: 'wss://test.io' }],
              xcmVersion: 'V5',
            },
            assetsInfo: {
              relaychainSymbol: 'DOT',
              nativeAssetSymbol: 'MYC',
              isEVM: false,
              ss58Prefix: 42,
              supportsDryRunApi: false,
              supportsXcmPaymentApi: false,
              assets: [],
            },
          },
        },
        customAssets: {
          AssetHubPolkadot: [
            {
              symbol: 'MYTOKEN',
              decimals: 12,
              location: { parents: 1, interior: 'Here' },
              existentialDeposit: '1000000',
              isNative: false,
            },
          ],
        },
      };

      const result = parseCustomConfig(JSON.stringify(validConfig));
      expect(result.version).toBe(1);
      expect(result.customChains.MyChain.input.paraId).toBe(1000);
      expect(result.customAssets.AssetHubPolkadot?.[0].symbol).toBe('MYTOKEN');
    });

    it('round-trips buildCustomConfig into parseCustomConfig successfully', () => {
      const chains: TStoredCustomChains = {
        ChainA: {
          input: {
            paraId: 2000,
            ecosystem: 'Polkadot',
            providers: [{ name: 'A', endpoint: 'wss://a.io' }],
            xcmVersion: 'V5',
          },
          assetsInfo: {
            relaychainSymbol: 'DOT',
            nativeAssetSymbol: 'A',
            isEVM: false,
            ss58Prefix: 42,
            supportsDryRunApi: false,
            supportsXcmPaymentApi: false,
            assets: [],
          },
        },
      };
      const assets: TCustomAssetsMap = {
        AssetHubPolkadot: [
          {
            symbol: 'ASSET_A',
            decimals: 10,
            location: { parents: 1, interior: { Here: null } },
            existentialDeposit: '500',
          },
        ],
      };

      const config = buildCustomConfig(chains, assets);
      const parsed = parseCustomConfig(JSON.stringify(config));
      expect(parsed.customChains).toEqual(chains);
      expect(parsed.customAssets).toEqual(assets);
    });
  });
});
