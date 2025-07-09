/**
 * File system management service for the Besu SDK
 * 
 * This service handles all file system operations required by the SDK,
 * including creating directories, writing configuration files, and managing
 * node data. It provides a clean abstraction over Node.js fs operations
 * with proper error handling and logging.
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { FileSystemError } from '../errors';
import { logger } from '../utils/logger';

/**
 * FileManager handles all file system operations for the Besu network
 * 
 * Responsibilities include:
 * - Creating and managing directory structures
 * - Writing configuration and key files
 * - Reading existing configurations
 * - Cleaning up resources on teardown
 */
export class FileManager {
  private readonly log = logger.child('FileManager');

  /**
   * Validates a file or directory path.
   *
   * @param filePath The path to validate.
   * @throws FileSystemError if the path is invalid (e.g., contains null bytes).
   */
  private validatePath(filePath: string): void {
    if (filePath.includes('\x00')) {
      throw new FileSystemError('pathValidation', filePath, new Error('Path contains null bytes.'));
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   * 
   * @param dirPath Path to the directory
   * @throws FileSystemError if creation fails
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      this.validatePath(dirPath);
      await fs.mkdir(dirPath, { recursive: true });
      this.log.debug(`Ensured directory exists: ${dirPath}`);
    } catch (error) {
      this.log.error(`Failed to create directory: ${dirPath}`, error);
      throw new FileSystemError('mkdir', dirPath, error as Error);
    }
  }
  
  /**
   * Write a text file with the specified content
   * 
   * @param filePath Path to the file
   * @param content Text content to write
   * @throws FileSystemError if write fails
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      this.validatePath(filePath);
      // Ensure parent directory exists
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);
      
      // Write file
      await fs.writeFile(filePath, content, 'utf8');
      this.log.debug(`Wrote file: ${filePath}`);
    } catch (error) {
      this.log.error(`Failed to write file: ${filePath}`, error);
      throw new FileSystemError('writeFile', filePath, error as Error);
    }
  }
  
  /**
   * Write a JSON file with proper formatting
   * 
   * @param filePath Path to the JSON file
   * @param data Object to serialize to JSON
   * @throws FileSystemError if write fails
   */
  async writeJSON(filePath: string, data: any): Promise<void> {
    try {
      const content = JSON.stringify(data, null, 2);
      await this.writeFile(filePath, content);
      this.log.debug(`Wrote JSON file: ${filePath}`);
    } catch (error) {
      this.log.error(`Failed to write JSON file: ${filePath}`, error);
      throw new FileSystemError('writeJSON', filePath, error as Error);
    }
  }
  
  /**
   * Read a text file
   * 
   * @param filePath Path to the file
   * @returns File content as string
   * @throws FileSystemError if read fails
   */
  async readFile(filePath: string): Promise<string> {
    try {
      this.validatePath(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      this.log.debug(`Read file: ${filePath}`);
      return content;
    } catch (error) {
      this.log.error(`Failed to read file: ${filePath}`, error);
      throw new FileSystemError('readFile', filePath, error as Error);
    }
  }
  
  /**
   * Read and parse a JSON file
   * 
   * @param filePath Path to the JSON file
   * @returns Parsed JSON data
   * @throws FileSystemError if read or parse fails
   */
  async readJSON<T = any>(filePath: string): Promise<T> {
    try {
      const content = await this.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      this.log.error(`Failed to parse JSON file: ${filePath}`, error);
      throw new FileSystemError('readJSON', filePath, error as Error);
    }
  }
  
  /**
   * Check if a file or directory exists
   * 
   * @param itemPath Path to check
   * @returns True if exists, false otherwise
   */
  async exists(itemPath: string): Promise<boolean> {
    try {
      this.validatePath(itemPath);
      await fs.access(itemPath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Remove a file
   * 
   * @param filePath Path to the file
   * @throws FileSystemError if removal fails
   */
  async removeFile(filePath: string): Promise<void> {
    try {
      this.validatePath(filePath);
      await fs.unlink(filePath);
      this.log.debug(`Removed file: ${filePath}`);
    } catch (error) {
      // Ignore if file doesn't exist
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        this.log.debug(`File already removed: ${filePath}`);
        return;
      }
      this.log.error(`Failed to remove file: ${filePath}`, error);
      throw new FileSystemError('removeFile', filePath, error as Error);
    }
  }
  
  /**
   * Remove a directory and all its contents
   * 
   * @param dirPath Path to the directory
   * @throws FileSystemError if removal fails
   */
  async removeDirectory(dirPath: string): Promise<void> {
    try {
      this.validatePath(dirPath);
      await fs.rm(dirPath, { recursive: true, force: true });
      this.log.debug(`Removed directory: ${dirPath}`);
    } catch (error) {
      this.log.error(`Failed to remove directory: ${dirPath}`, error);
      throw new FileSystemError('removeDirectory', dirPath, error as Error);
    }
  }
  
  /**
   * Copy a file from source to destination
   * 
   * @param source Source file path
   * @param destination Destination file path
   * @throws FileSystemError if copy fails
   */
  async copyFile(source: string, destination: string): Promise<void> {
    try {
      this.validatePath(source);
      this.validatePath(destination);
      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      await this.ensureDirectory(destDir);
      
      // Copy file
      await fs.copyFile(source, destination);
      this.log.debug(`Copied file from ${source} to ${destination}`);
    } catch (error) {
      this.log.error(`Failed to copy file from ${source} to ${destination}`, error);
      throw new FileSystemError('copyFile', source, error as Error);
    }
  }
  
  /**
   * List all files in a directory
   * 
   * @param dirPath Directory path
   * @param recursive Whether to list recursively
   * @returns Array of file paths
   * @throws FileSystemError if listing fails
   */
  async listFiles(dirPath: string, recursive = false): Promise<string[]> {
    try {
      this.validatePath(dirPath);
      const files: string[] = [];
      
      const processDirectory = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && recursive) {
            await processDirectory(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      };
      
      await processDirectory(dirPath);
      this.log.debug(`Listed ${files.length} files in ${dirPath}`);
      return files;
    } catch (error) {
      this.log.error(`Failed to list files in: ${dirPath}`, error);
      throw new FileSystemError('listFiles', dirPath, error as Error);
    }
  }
  
  /**
   * List all directories in a directory
   * 
   * @param dirPath Directory path
   * @returns Array of directory names (not full paths)
   * @throws FileSystemError if listing fails
   */
  async listDirectories(dirPath: string): Promise<string[]> {
    try {
      this.validatePath(dirPath);
      const directories: string[] = [];
      
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          directories.push(entry.name);
        }
      }
      
      this.log.debug(`Listed ${directories.length} directories in ${dirPath}`);
      return directories;
    } catch (error) {
      this.log.error(`Failed to list directories in: ${dirPath}`, error);
      throw new FileSystemError('listDirectories', dirPath, error as Error);
    }
  }

  /**
   * Get file stats
   * 
   * @param filePath Path to the file
   * @returns File stats
   * @throws FileSystemError if stat fails
   */
  async getStats(filePath: string): Promise<fsSync.Stats> {
    try {
      this.validatePath(filePath);
      const stats = await fs.stat(filePath);
      this.log.debug(`Retrieved stats for: ${filePath}`);
      return stats;
    } catch (error) {
      this.log.error(`Failed to get stats for: ${filePath}`, error);
      throw new FileSystemError('getStats', filePath, error as Error);
    }
  }
  
  /**
   * Create the directory structure for a Besu network
   * 
   * Creates the standard layout expected by the SDK:
   * - Root network directory
   * - Genesis file location
   * - Individual node directories
   * 
   * @param networkPath Root path for the network
   * @param nodeNames List of node names to create directories for
   */
  async createNetworkStructure(networkPath: string, nodeNames: string[]): Promise<void> {
    try {
      // Create main network directory
      await this.ensureDirectory(networkPath);
      
      // Create nodes directory
      const nodesPath = path.join(networkPath, 'nodes');
      await this.ensureDirectory(nodesPath);
      
      // Create individual node directories
      for (const nodeName of nodeNames) {
        const nodePath = path.join(nodesPath, nodeName);
        await this.ensureDirectory(nodePath);
      }
      
      this.log.info(`Created network structure at: ${networkPath}`);
    } catch (error) {
      this.log.error(`Failed to create network structure at: ${networkPath}`, error);
      throw error;
    }
  }
  
  /**
   * Write node key files required by Besu
   * 
   * Besu expects specific file formats for node keys:
   * - 'key': Private key without 0x prefix
   * - 'key.pub': Public key without 0x prefix  
   * - 'address': Ethereum address without 0x prefix
   * 
   * @param nodePath Path to the node directory
   * @param privateKey Private key with 0x prefix
   * @param publicKey Public key with 0x prefix
   * @param address Ethereum address with 0x prefix
   */
  async writeNodeKeys(
    nodePath: string,
    privateKey: string,
    publicKey: string,
    address: string
  ): Promise<void> {
    try {
      // Strip 0x prefix for Besu format
      const keyContent = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      const pubKeyContent = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
      const addressContent = address.startsWith('0x') ? address.slice(2) : address;
      
      // Write key files
      await this.writeFile(path.join(nodePath, 'key'), keyContent);
      await this.writeFile(path.join(nodePath, 'key.pub'), pubKeyContent);
      await this.writeFile(path.join(nodePath, 'address'), addressContent);
      
      this.log.debug(`Wrote node keys for: ${nodePath}`);
    } catch (error) {
      this.log.error(`Failed to write node keys for: ${nodePath}`, error);
      throw error;
    }
  }
  
  /**
   * Ensure the base data directory exists for storing networks
   * 
   * @param baseDir Base directory path (default: ./besu-networks)
   * @returns Resolved absolute path to the base directory
   */
  async ensureBaseDataDirectory(baseDir = './besu-networks'): Promise<string> {
    const absolutePath = path.resolve(baseDir);
    await this.ensureDirectory(absolutePath);
    return absolutePath;
  }
}