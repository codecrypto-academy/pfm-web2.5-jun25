import { ethers } from 'ethers';
import { CryptoUtils } from '../utils/crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Transfer Tests', () => {
  const testMnemonic = 'test test test test test test test test test test test junk';
  const tempDir = path.join(__dirname, 'temp');

  beforeAll(async () => {
    await fs.ensureDir(tempDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  describe('Transfer validation', () => {
    it('should validate transfer parameters', () => {
      const validTransfer = {
        from: 0,
        to: 2,
        amount: '12.5'
      };

      // Verificar que los índices están en rango
      expect(validTransfer.from).toBeGreaterThanOrEqual(0);
      expect(validTransfer.to).toBeGreaterThanOrEqual(0);
      expect(validTransfer.from).toBeLessThan(10);
      expect(validTransfer.to).toBeLessThan(10);

      // Verificar que no es la misma dirección
      expect(validTransfer.from).not.toBe(validTransfer.to);

      // Verificar que la cantidad es válida
      const amount = parseFloat(validTransfer.amount);
      expect(amount).toBeGreaterThan(0);
      expect(amount).toBeLessThanOrEqual(20);
    });

    it('should detect invalid transfer parameters', () => {
      const invalidTransfers = [
        { from: 0, to: 0, amount: '12.5' }, // Misma dirección
        { from: -1, to: 2, amount: '12.5' }, // Índice negativo
        { from: 0, to: 15, amount: '12.5' }, // Índice fuera de rango
        { from: 0, to: 2, amount: '-5.0' }, // Cantidad negativa
        { from: 0, to: 2, amount: '25.0' }  // Cantidad muy alta
      ];

      invalidTransfers.forEach(transfer => {
        const isValid = 
          transfer.from >= 0 && 
          transfer.to >= 0 && 
          transfer.from < 10 && 
          transfer.to < 10 &&
          transfer.from !== transfer.to &&
          parseFloat(transfer.amount) > 0 &&
          parseFloat(transfer.amount) <= 20;

        expect(isValid).toBe(false);
      });
    });

    it('should calculate correct gas costs', () => {
      const gasPrice = '1000000000'; // 1 gwei
      const gasLimit = 21000;
      const expectedGasCost = BigInt(gasPrice) * BigInt(gasLimit);

      const transfer = { from: 0, to: 2, amount: '12.5' };
      const amountToSend = ethers.parseEther(transfer.amount);
      const totalCost = amountToSend + expectedGasCost;

      // Verificar que el cálculo del costo total es correcto
      expect(totalCost).toBeGreaterThan(amountToSend);
    });

    it('should verify transfer amounts are correct', () => {
      const transfers = [
        { from: 0, to: 2, amount: '12.5' },
        { from: 1, to: 4, amount: '15.3' },
        { from: 3, to: 7, amount: '11.8' },
        { from: 5, to: 9, amount: '13.2' },
        { from: 6, to: 1, amount: '14.7' }
      ];

      transfers.forEach(transfer => {
        // Verificar que las cantidades son números válidos
        const amount = parseFloat(transfer.amount);
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeLessThanOrEqual(20); // Máximo 20 ETH

        // Verificar que las cantidades son las esperadas
        expect(transfer.amount).toMatch(/^\d+\.\d+$/);
      });
    });

    it('should validate sender and receiver addresses', () => {
      // Generar direcciones reales para testing
      const addresses = CryptoUtils.generateDerivedAddresses(testMnemonic, 5);
      
      const transfers = [
        { from: 0, to: 2, amount: '12.5' },
        { from: 1, to: 4, amount: '15.3' }
      ];

      transfers.forEach(transfer => {
        const senderAddress = addresses[transfer.from];
        const receiverAddress = addresses[transfer.to];

        // Verificar que las direcciones son válidas
        expect(CryptoUtils.isValidAddress(senderAddress)).toBe(true);
        expect(CryptoUtils.isValidAddress(receiverAddress)).toBe(true);

        // Verificar que no son la misma dirección
        expect(senderAddress).not.toBe(receiverAddress);
      });
    });

    it('should test circular transfer pattern', () => {
      // Crear un patrón de transferencias circulares
      const circularTransfers = [
        { from: 0, to: 1, amount: '5.0' },
        { from: 1, to: 2, amount: '5.0' },
        { from: 2, to: 3, amount: '5.0' },
        { from: 3, to: 0, amount: '5.0' }
      ];

      // Verificar que el patrón circular es válido
      expect(circularTransfers).toHaveLength(4);
      
      // Verificar que la última transferencia vuelve al origen
      expect(circularTransfers[3].to).toBe(0);
      expect(circularTransfers[3].from).toBe(3);
    });

    it('should handle multiple transfers in sequence', () => {
      const transfers = [
        { from: 0, to: 2, amount: '12.5' },
        { from: 1, to: 4, amount: '15.3' },
        { from: 3, to: 7, amount: '11.8' }
      ];

      // Verificar que todas las transferencias son válidas
      expect(transfers).toHaveLength(3);
      
      transfers.forEach(transfer => {
        expect(transfer.from).toBeGreaterThanOrEqual(0);
        expect(transfer.to).toBeGreaterThanOrEqual(0);
        expect(transfer.from).toBeLessThan(10);
        expect(transfer.to).toBeLessThan(10);
        expect(transfer.from).not.toBe(transfer.to);
        
        const amount = parseFloat(transfer.amount);
        expect(amount).toBeGreaterThan(0);
        expect(amount).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('Transfer simulation', () => {
    it('should simulate transfer between addresses', () => {
      const addresses = CryptoUtils.generateDerivedAddresses(testMnemonic, 3);
      const wallets = CryptoUtils.generateDerivedWallets(testMnemonic, 3);

      const transfer = {
        from: 0,
        to: 2,
        amount: '12.5'
      };

      const senderWallet = wallets[transfer.from];
      const receiverAddress = addresses[transfer.to];

      // Simular validaciones
      expect(senderWallet.address).toBeDefined();
      expect(receiverAddress).toBeDefined();
      expect(senderWallet.address).not.toBe(receiverAddress);
      expect(CryptoUtils.isValidAddress(senderWallet.address)).toBe(true);
      expect(CryptoUtils.isValidAddress(receiverAddress)).toBe(true);

      // Simular cálculo de gas
      const gasPrice = '1000000000'; // 1 gwei
      const gasLimit = 21000;
      const gasCost = BigInt(gasPrice) * BigInt(gasLimit);
      const amountToSend = ethers.parseEther(transfer.amount);
      const totalCost = amountToSend + gasCost;

      expect(totalCost).toBeGreaterThan(amountToSend);
      expect(gasCost).toBeGreaterThan(0);
    });

    it('should handle insufficient balance simulation', () => {
      const addresses = CryptoUtils.generateDerivedAddresses(testMnemonic, 2);
      const wallets = CryptoUtils.generateDerivedWallets(testMnemonic, 2);

      const transfer = {
        from: 0,
        to: 1,
        amount: '25.0' // Cantidad muy alta
      };

      const senderWallet = wallets[transfer.from];
      const receiverAddress = addresses[transfer.to];

      // Simular balance insuficiente
      const balance = ethers.parseEther('10.0'); // Solo 10 ETH
      const amountToSend = ethers.parseEther(transfer.amount);
      const gasCost = ethers.parseEther('0.001'); // 0.001 ETH para gas
      const totalCost = amountToSend + gasCost;

      // Verificar que no hay fondos suficientes
      expect(totalCost).toBeGreaterThan(balance);
      expect(amountToSend).toBeGreaterThan(balance);
    });
  });
}); 