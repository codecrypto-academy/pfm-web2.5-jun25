/**
 * Docker Status API
 * GET /api/docker/status - Check Docker availability and information
 * 
 * @returns {Object} Response object
 * @returns {boolean} response.success - Whether the request was successful
 * @returns {Object} response.docker - Docker information
 * @returns {boolean} response.docker.available - Whether Docker is available
 * @returns {string} response.docker.version - Docker version
 * @returns {Object} response.docker.info - Docker system information
 * @returns {number} response.docker.info.containers - Number of containers
 * @returns {number} response.docker.info.images - Number of images
 * @returns {string} response.docker.info.serverVersion - Docker server version
 * @returns {string} response.docker.info.operatingSystem - Operating system
 * @returns {string} response.docker.info.architecture - System architecture
 * @returns {number} response.docker.info.memTotal - Total memory in bytes
 * @returns {number} response.docker.info.ncpu - Number of CPUs
 */
import { NextResponse } from 'next/server';
import { DockerManager } from 'besu-network-manager';

const dockerManager = new DockerManager();

export async function GET() {
  try {
    const isAvailable = await dockerManager.isDockerAvailable();
    
    if (!isAvailable) {
      return NextResponse.json({
        success: true,
        docker: {
          available: false,
          error: 'Docker daemon is not running or not accessible'
        }
      });
    }

    // Get basic Docker info using the docker instance directly
    try {
      const dockerInfo = await dockerManager.docker.info();
      const dockerVersion = await dockerManager.docker.version();
      
      return NextResponse.json({
        success: true,
        docker: {
          available: true,
          version: dockerVersion.Version,
          info: {
            containers: dockerInfo.Containers,
            images: dockerInfo.Images,
            serverVersion: dockerInfo.ServerVersion,
            operatingSystem: dockerInfo.OperatingSystem,
            architecture: dockerInfo.Architecture,
            memTotal: dockerInfo.MemTotal,
            ncpu: dockerInfo.NCPU
          }
        }
      });
    } catch (infoError) {
      // If we can't get detailed info, just return that Docker is available
      return NextResponse.json({
        success: true,
        docker: {
          available: true,
          info: {
            message: 'Docker is available but detailed info could not be retrieved'
          }
        }
      });
    }

  } catch (error) {
    console.error('Failed to check Docker status:', error);
    return NextResponse.json({
      success: true,
      docker: {
        available: false,
        error: 'Failed to communicate with Docker daemon'
      }
    });
  }
}
