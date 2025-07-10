import { NetworkService } from '@lib/services/network.service';

let networkService: NetworkService | null = null;

export function setNetworkService(service: NetworkService | null) {
  networkService = service;
}

export { networkService }; 