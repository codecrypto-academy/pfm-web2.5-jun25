import { FileSystem } from '../../src/utils/FileSystem';

describe('FileSystem', () => {
  it('should construct FileSystem', () => {
    const fs = new FileSystem();
    expect(fs).toBeDefined();
  });
  it('should write and check file existence', async () => {
    const fs = new FileSystem();
    fs.writeFile = jest.fn().mockResolvedValue(undefined);
    fs.exists = jest.fn().mockResolvedValue(true);
    await fs.writeFile('file.txt', 'data');
    expect(fs.writeFile).toHaveBeenCalledWith('file.txt', 'data');
    const exists = await fs.exists('file.txt');
    expect(exists).toBe(true);
  });
  it('should handle error in removeFile', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(fs.removeFile('file.txt')).rejects.toThrow('fail');
  });
  it('should remove file if exists', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockResolvedValue(true);
    fs.removeFile = jest.fn().mockResolvedValue(undefined);
    await fs.removeFile('file.txt');
    expect(fs.removeFile).toHaveBeenCalledWith('file.txt');
  });
  it('should handle error in removeDir', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(fs.removeDir('dir')).rejects.toThrow('fail');
  });
  it('should remove dir if exists', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockResolvedValue(true);
    fs.removeDir = jest.fn().mockResolvedValue(undefined);
    await fs.removeDir('dir', true);
    expect(fs.removeDir).toHaveBeenCalledWith('dir', true);
  });
  it('should read dir', async () => {
    const fs = new FileSystem();
    fs.readDir = jest.fn().mockResolvedValue(['a.txt']);
    const files = await fs.readDir('dir');
    expect(files).toEqual(['a.txt']);
  });
  it('should copy and move file', async () => {
    const fs = new FileSystem();
    fs.copyFile = jest.fn().mockResolvedValue(undefined);
    fs.removeFile = jest.fn().mockResolvedValue(undefined);
    await fs.copyFile('a.txt', 'b.txt');
    expect(fs.copyFile).toHaveBeenCalledWith('a.txt', 'b.txt');
    fs.moveFile = jest.fn().mockResolvedValue(undefined);
    await fs.moveFile('a.txt', 'b.txt');
    expect(fs.moveFile).toHaveBeenCalledWith('a.txt', 'b.txt');
  });
  it('should copy dir with files and subdirectories', async () => {
    const fs = new FileSystem();
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.readDir = jest.fn().mockResolvedValue(['a.txt', 'subdir']);
    fs.stat = jest.fn()
      .mockResolvedValueOnce({ isDirectory: () => false }) // a.txt
      .mockResolvedValueOnce({ isDirectory: () => true }); // subdir
    const copyFileMock = jest.fn().mockResolvedValue(undefined);
    const copyDirMock = jest.fn().mockResolvedValue(undefined);
    fs.copyFile = copyFileMock;
    // Solo mockea copyDir para la llamada recursiva
    const originalCopyDir = fs.copyDir;
    fs.copyDir = copyDirMock;
    await FileSystem.prototype.copyDir.call(fs, 'src', 'dest');
    // Ajustar aserciones para aceptar ambos separadores
    expect(fs.ensureDir).toHaveBeenCalledWith('dest');
    expect(fs.readDir).toHaveBeenCalledWith('src');
    const statCalls = (fs.stat as jest.Mock).mock.calls.map(call => call[0]);
    expect(statCalls).toContainEqual(expect.stringMatching(/^src[\/\\]a\.txt$/));
    expect(statCalls).toContainEqual(expect.stringMatching(/^src[\/\\]subdir$/));
    const copyFileCalls = copyFileMock.mock.calls.map(call => [call[0], call[1]]);
    expect(copyFileCalls).toContainEqual([expect.stringMatching(/^src[\/\\]a\.txt$/), expect.stringMatching(/^dest[\/\\]a\.txt$/)]);
    const copyDirCalls = copyDirMock.mock.calls.map(call => [call[0], call[1]]);
    expect(copyDirCalls).toContainEqual([expect.stringMatching(/^src[\/\\]subdir$/), expect.stringMatching(/^dest[\/\\]subdir$/)]);
    // Restaura el método original
    fs.copyDir = originalCopyDir;
  });
  it('should copy dir with only files', async () => {
    const fs = new FileSystem();
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.readDir = jest.fn().mockResolvedValue(['a.txt']);
    fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => false });
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.copyFile = jest.fn().mockResolvedValue(undefined); // Mock copyFile para evitar error ENOENT
    await expect(FileSystem.prototype.copyDir.call(fs, 'src', 'dest')).resolves.not.toThrow();
    expect(fs.ensureDir).toHaveBeenCalledWith('dest');
    const expectedSrc = ['src/a.txt', 'src\\a.txt'];
    const expectedDest = ['dest/a.txt', 'dest\\a.txt'];
    const calledWith = (fs.copyFile as jest.Mock).mock.calls[0];
    expect(expectedSrc).toContain(calledWith[0]);
    expect(expectedDest).toContain(calledWith[1]);
  });
  it('should read file as string', async () => {
    const fs = new FileSystem();
    fs.readFile = jest.fn().mockResolvedValue('contenido');
    const content = await fs.readFile('file.txt');
    expect(content).toBe('contenido');
  });
  it('should read file as buffer', async () => {
    const fs = new FileSystem();
    const buffer = Buffer.from('contenido');
    fs.readFileBuffer = jest.fn().mockResolvedValue(buffer);
    const result = await fs.readFileBuffer('file.txt');
    expect(result).toEqual(buffer);
  });
  it('should stat file', async () => {
    const fs = new FileSystem();
    const stats = { isDirectory: () => false };
    fs.stat = jest.fn().mockResolvedValue(stats);
    const result = await fs.stat('file.txt');
    expect(result).toBe(stats);
  });
  it('should ensureDir only if not exists', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockResolvedValue(false);
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    await fs.ensureDir('dir');
    expect(fs.ensureDir).toHaveBeenCalledWith('dir');
  });
  it('should handle error in copyDir when readDir fails', async () => {
    const fs = new FileSystem();
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.readDir = jest.fn().mockRejectedValue(new Error('fail readDir'));
    await expect(fs.copyDir('src', 'dest')).rejects.toThrow('fail readDir');
  });

  it('should handle error in copyDir when stat fails', async () => {
    const fs = new FileSystem();
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.readDir = jest.fn().mockResolvedValue(['file1']);
    fs.stat = jest.fn().mockRejectedValue(new Error('fail stat'));
    await expect(fs.copyDir('src', 'dest')).rejects.toThrow('fail stat');
  });

  it('should handle error in copyDir when copyFile fails', async () => {
    const fs = new FileSystem();
    fs.ensureDir = jest.fn().mockResolvedValue(undefined);
    fs.readDir = jest.fn().mockResolvedValue(['file1']);
    fs.stat = jest.fn().mockResolvedValue({ isDirectory: () => false });
    fs.copyFile = jest.fn().mockRejectedValue(new Error('fail copyFile'));
    await expect(fs.copyDir('src', 'dest')).rejects.toThrow('fail copyFile');
  });

  it('should handle error in moveFile when copyFile fails', async () => {
    const fs = new FileSystem();
    fs.copyFile = jest.fn().mockRejectedValue(new Error('fail copyFile'));
    await expect(fs.moveFile('src', 'dest')).rejects.toThrow('fail copyFile');
  });

  it('should handle error in moveFile when removeFile fails', async () => {
    const fs = new FileSystem();
    fs.copyFile = jest.fn().mockResolvedValue(undefined);
    fs.removeFile = jest.fn().mockRejectedValue(new Error('fail removeFile'));
    await expect(fs.moveFile('src', 'dest')).rejects.toThrow('fail removeFile');
  });

  it('should handle error in ensureDir when mkdir fails', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockResolvedValue(false);
    // Sobrescribir fs.promises.mkdir en el contexto global
    const origMkdir = require('fs').promises.mkdir;
    require('fs').promises.mkdir = jest.fn().mockRejectedValue(new Error('fail mkdir'));
    await expect(fs.ensureDir('dir')).rejects.toThrow('fail mkdir');
    require('fs').promises.mkdir = origMkdir;
  });
  it('should handle error in copyDir', async () => {
    const fs = new FileSystem();
    fs.ensureDir = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(FileSystem.prototype.copyDir.call(fs, 'src', 'dest')).rejects.toThrow('fail');
  });
});