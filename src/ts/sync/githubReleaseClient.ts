/**
 * Blood on the Clocktower Token Generator
 * GitHub Release Client - Fetch and download releases from GitHub API
 *
 * Features:
 * - Rate limit detection and exponential backoff
 * - ETag support for conditional requests (free quota)
 * - Release metadata fetching
 * - ZIP asset downloading
 */

import CONFIG from '@/ts/config.js';
import { DataSyncError, GitHubAPIError } from '@/ts/errors.js';
import type { GitHubAsset, GitHubRelease } from '@/ts/types/index.js';
import { applyCorsProxy } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Rate limit information from GitHub API headers
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

/**
 * Cached ETag for conditional requests
 */
interface ETagCache {
  etag: string;
  data: GitHubRelease;
  timestamp: number;
}

/**
 * GitHub Release Client for fetching official data releases
 */
export class GitHubReleaseClient {
  private etagCache: ETagCache | null = null;
  private lastRateLimitInfo: RateLimitInfo | null = null;

  /**
   * Construct the GitHub API URL for the latest release
   */
  private getLatestReleaseUrl(): string {
    const { GITHUB_API_BASE, GITHUB_REPO } = CONFIG.SYNC;
    return `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`;
  }

  /**
   * Parse rate limit information from response headers
   */
  private parseRateLimitHeaders(headers: Headers): RateLimitInfo {
    const limit = parseInt(headers.get('X-RateLimit-Limit') || '60', 10);
    const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '0', 10);
    const reset = parseInt(headers.get('X-RateLimit-Reset') || '0', 10);
    const used = parseInt(headers.get('X-RateLimit-Used') || '0', 10);

    return {
      limit,
      remaining,
      reset: new Date(reset * 1000),
      used,
    };
  }

  /**
   * Check if we're currently rate limited
   */
  private isRateLimited(): boolean {
    if (!this.lastRateLimitInfo) {
      return false;
    }

    const { remaining, reset } = this.lastRateLimitInfo;
    const now = new Date();

    // If we have remaining requests, we're not limited
    if (remaining > 0) {
      return false;
    }

    // If limit has reset, we're not limited
    if (now >= reset) {
      return false;
    }

    return true;
  }

  /**
   * Get time until rate limit resets
   */
  private getResetTimeMinutes(): number {
    if (!this.lastRateLimitInfo) {
      return 0;
    }

    const now = new Date();
    const resetTime = this.lastRateLimitInfo.reset;
    const diffMs = resetTime.getTime() - now.getTime();
    return Math.ceil(diffMs / 60000);
  }

  /**
   * Sleep for a specified duration
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Perform a request with exponential backoff retry
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Update rate limit info
      this.lastRateLimitInfo = this.parseRateLimitHeaders(response.headers);

      // If rate limited, retry with backoff
      if (response.status === 403 && this.lastRateLimitInfo.remaining === 0) {
        const resetMinutes = this.getResetTimeMinutes();

        if (attempt < CONFIG.SYNC.MAX_RETRIES) {
          const delay = CONFIG.SYNC.RETRY_DELAY_MS * 2 ** attempt;
          logger.warn(
            'GitHubReleaseClient',
            `Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${CONFIG.SYNC.MAX_RETRIES})`
          );
          await this.sleep(delay);
          return this.fetchWithRetry(url, options, attempt + 1);
        }

        throw new GitHubAPIError(
          `GitHub API rate limit exceeded. Resets in ${resetMinutes} minutes.`,
          403,
          true
        );
      }

      return response;
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        throw error;
      }

      // Network or other errors
      if (attempt < CONFIG.SYNC.MAX_RETRIES) {
        const delay = CONFIG.SYNC.RETRY_DELAY_MS * 2 ** attempt;
        logger.warn(
          'GitHubReleaseClient',
          `Request failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${CONFIG.SYNC.MAX_RETRIES})`
        );
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      throw new DataSyncError(
        'Failed to connect to GitHub API',
        'github-fetch',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Fetch the latest release information
   * Uses ETag for conditional requests to save quota
   * @param forceRefresh - Force a fresh fetch, ignoring ETag cache
   * @returns Latest release information, or null if not modified (304)
   */
  async fetchLatestRelease(forceRefresh: boolean = false): Promise<GitHubRelease | null> {
    // Check if we're rate limited before making request
    if (this.isRateLimited()) {
      const resetMinutes = this.getResetTimeMinutes();
      throw new GitHubAPIError(
        `GitHub API rate limit exceeded. Resets in ${resetMinutes} minutes.`,
        403,
        true
      );
    }

    const url = this.getLatestReleaseUrl();
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'BOTC-Token-Generator',
    };

    // Add ETag header for conditional request (if we have cached data and not forcing refresh)
    if (this.etagCache && !forceRefresh) {
      headers['If-None-Match'] = this.etagCache.etag;
    }

    try {
      const response = await this.fetchWithRetry(url, { headers });

      // 304 Not Modified - data hasn't changed, return cached data
      if (response.status === 304) {
        logger.info('GitHubReleaseClient', 'Release not modified (304), using cached data');
        return this.etagCache?.data || null;
      }

      // Check for other error statuses
      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status,
          response.status === 403
        );
      }

      const data = (await response.json()) as GitHubRelease;

      // Cache ETag for future requests
      const etag = response.headers.get('ETag');
      if (etag) {
        this.etagCache = {
          etag,
          data,
          timestamp: Date.now(),
        };
      }

      logger.info('GitHubReleaseClient', 'Fetched latest release:', data.tag_name);
      return data;
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        throw error;
      }

      throw new DataSyncError(
        'Failed to fetch latest release',
        'github-fetch',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Download a ZIP asset from a GitHub release
   * @param asset - The asset to download
   * @param onProgress - Optional progress callback (current bytes, total bytes)
   * @returns Blob containing the ZIP file
   */
  async downloadAsset(
    asset: GitHubAsset,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob> {
    // Use browser_download_url with CORS proxy
    const url = applyCorsProxy(asset.browser_download_url);

    logger.info('GitHubReleaseClient', `Downloading asset via CORS proxy`);

    try {
      const response = await this.fetchWithRetry(url, {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'BOTC-Token-Generator',
        },
      });

      if (!response.ok) {
        throw new GitHubAPIError(
          `Failed to download asset: ${response.statusText}`,
          response.status
        );
      }

      // If no progress callback or content-length not available, just return blob
      const contentLength = response.headers.get('Content-Length');
      if (!(onProgress && contentLength)) {
        return await response.blob();
      }

      // Stream with progress tracking
      const total = parseInt(contentLength, 10);
      const reader = response.body?.getReader();

      if (!reader) {
        throw new DataSyncError('Response body not readable', 'download');
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        onProgress(receivedLength, total);
      }

      // Concatenate chunks into single blob
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      return new Blob([allChunks], { type: asset.content_type });
    } catch (error) {
      if (error instanceof GitHubAPIError || error instanceof DataSyncError) {
        throw error;
      }

      throw new DataSyncError(
        `Failed to download asset: ${asset.name}`,
        'download',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Find a ZIP asset in a release
   * @param release - GitHub release
   * @param pattern - Optional pattern to match (default: .zip)
   * @returns The ZIP asset or null if not found
   */
  findZipAsset(release: GitHubRelease, pattern: string = '.zip'): GitHubAsset | null {
    return (
      release.assets.find((asset) => asset.name.toLowerCase().includes(pattern.toLowerCase())) ||
      null
    );
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.lastRateLimitInfo;
  }

  /**
   * Clear the ETag cache (force fresh fetch on next request)
   */
  clearCache(): void {
    this.etagCache = null;
  }
}

// Export singleton instance
export const githubReleaseClient = new GitHubReleaseClient();

export default githubReleaseClient;
