import * as fs from 'fs';
import * as path from 'path';

/**
 * Clase para operaciones del sistema de archivos
 */
export class FileSystem {
  /**
   * Lee un archivo
   * @param filePath Ruta del archivo
   * @param encoding Codificación (por defecto utf8)
   */
  public async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    return fs.promises.readFile(filePath, { encoding });
  }

  /**
   * Lee un archivo como buffer
   * @param filePath Ruta del archivo
   */
  public async readFileBuffer(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  /**
   * Escribe en un archivo
   * @param filePath Ruta del archivo
   * @param data Datos a escribir
   */
  public async writeFile(filePath: string, data: string | Buffer): Promise<void> {
    return fs.promises.writeFile(filePath, data);
  }

  /**
   * Comprueba si un archivo o directorio existe
   * @param path Ruta del archivo o directorio
   */
  public async exists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crea un directorio si no existe
   * @param dirPath Ruta del directorio
   */
  public async ensureDir(dirPath: string): Promise<void> {
    if (!await this.exists(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Elimina un archivo
   * @param filePath Ruta del archivo
   */
  public async removeFile(filePath: string): Promise<void> {
    if (await this.exists(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  /**
   * Elimina un directorio
   * @param dirPath Ruta del directorio
   * @param recursive Si se deben eliminar los contenidos recursivamente
   */
  public async removeDir(dirPath: string, recursive: boolean = true): Promise<void> {
    if (await this.exists(dirPath)) {
      await fs.promises.rm(dirPath, { recursive, force: true });
    }
  }

  /**
   * Lista los archivos en un directorio
   * @param dirPath Ruta del directorio
   */
  public async readDir(dirPath: string): Promise<string[]> {
    return fs.promises.readdir(dirPath);
  }

  /**
   * Copia un archivo
   * @param sourcePath Ruta de origen
   * @param destPath Ruta de destino
   */
  public async copyFile(sourcePath: string, destPath: string): Promise<void> {
    return fs.promises.copyFile(sourcePath, destPath);
  }

  /**
   * Mueve un archivo
   * @param sourcePath Ruta de origen
   * @param destPath Ruta de destino
   */
  public async moveFile(sourcePath: string, destPath: string): Promise<void> {
    await this.copyFile(sourcePath, destPath);
    await this.removeFile(sourcePath);
  }

  /**
   * Obtiene información de un archivo
   * @param filePath Ruta del archivo
   */
  public async stat(filePath: string): Promise<fs.Stats> {
    return fs.promises.stat(filePath);
  }

  /**
   * Copia un directorio recursivamente
   * @param sourceDir Directorio de origen
   * @param destDir Directorio de destino
   */
  public async copyDir(sourceDir: string, destDir: string): Promise<void> {
    // Crear el directorio de destino si no existe
    await this.ensureDir(destDir);

    // Leer los archivos del directorio de origen
    const files = await this.readDir(sourceDir);

    // Copiar cada archivo/directorio
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);

      const stats = await this.stat(sourcePath);

      if (stats.isDirectory()) {
        // Si es un directorio, copiarlo recursivamente
        await this.copyDir(sourcePath, destPath);
      } else {
        // Si es un archivo, copiarlo
        await this.copyFile(sourcePath, destPath);
      }
    }
  }
}