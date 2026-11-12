import type { TCustomAssetsMap } from '@paraspell/sdk';

import type { TStoredCustomChains } from '../types/TCustomChain';

const CONFIG_VERSION = 1;

export type TCustomConfigFile = {
  version: number;
  customChains: TStoredCustomChains;
  customAssets: TCustomAssetsMap;
};

export const buildCustomConfig = (
  customChains: TStoredCustomChains,
  customAssets: TCustomAssetsMap,
): TCustomConfigFile => ({
  version: CONFIG_VERSION,
  customChains,
  customAssets,
});

export const downloadCustomConfig = (config: TCustomConfigFile) => {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'paraspell-custom-config.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validateCustomChainEntry = (name: string, entry: unknown): void => {
  if (!isRecord(entry)) {
    throw new Error(`Invalid customChain entry for "${name}". Must be an object.`);
  }

  const { input, assetsInfo } = entry;
  if (!isRecord(input)) {
    throw new Error(`Invalid customChain entry for "${name}". "input" must be an object.`);
  }

  if (!isRecord(assetsInfo)) {
    throw new Error(`Invalid customChain entry for "${name}". "assetsInfo" must be an object.`);
  }

  if (!Array.isArray(assetsInfo.assets)) {
    throw new Error(`Invalid customChain entry for "${name}". "assetsInfo.assets" must be an array.`);
  }
};

const validateCustomAssetEntry = (
  chain: string,
  asset: unknown,
  index: number,
): void => {
  if (!isRecord(asset)) {
    throw new Error(
      `Invalid asset in "customAssets.${chain}[${index}]". Must be an object.`,
    );
  }

  if (typeof asset.symbol !== 'string' || asset.symbol.trim() === '') {
    throw new Error(
      `Invalid asset in "customAssets.${chain}[${index}]". "symbol" must be a non-empty string.`,
    );
  }

  if (
    typeof asset.decimals !== 'number' ||
    !Number.isInteger(asset.decimals) ||
    asset.decimals < 0
  ) {
    throw new Error(
      `Invalid asset in "customAssets.${chain}[${index}]". "decimals" must be a non-negative integer.`,
    );
  }

  if (!isRecord(asset.location)) {
    throw new Error(
      `Invalid asset in "customAssets.${chain}[${index}]". "location" must be an object.`,
    );
  }

  if (typeof asset.existentialDeposit !== 'string') {
    throw new Error(
      `Invalid asset in "customAssets.${chain}[${index}]". "existentialDeposit" must be a string.`,
    );
  }
};

export const parseCustomConfig = (text: string): TCustomConfigFile => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Config must be a JSON object.');
  }

  const { customChains, customAssets } = parsed;

  if (customChains !== undefined && !isRecord(customChains)) {
    throw new Error('"customChains" must be an object.');
  }

  if (customAssets !== undefined && !isRecord(customAssets)) {
    throw new Error('"customAssets" must be an object.');
  }

  if (customChains === undefined && customAssets === undefined) {
    throw new Error(
      'Config must contain "customChains" and/or "customAssets".',
    );
  }

  if (customChains !== undefined) {
    for (const [name, entry] of Object.entries(customChains)) {
      validateCustomChainEntry(name, entry);
    }
  }

  if (customAssets !== undefined) {
    for (const [chain, list] of Object.entries(customAssets)) {
      if (!Array.isArray(list)) {
        throw new Error(`"customAssets" for "${chain}" must be an array.`);
      }
      list.forEach((asset, idx) => validateCustomAssetEntry(chain, asset, idx));
    }
  }

  return {
    version:
      typeof parsed.version === 'number' ? parsed.version : CONFIG_VERSION,
    customChains: (customChains ?? {}) as TStoredCustomChains,
    customAssets: customAssets ?? {},
  };
};
