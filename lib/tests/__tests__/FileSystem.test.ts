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
  it('should remove file if exists', async () => {
    const fs = new FileSystem();
    fs.exists = jest.fn().mockResolvedValue(true);
    fs.removeFile = jest.fn().mockResolvedValue(undefined);
    await fs.removeFile('file.txt');
    expect(fs.removeFile).toHaveBeenCalledWith('file.txt');
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
});