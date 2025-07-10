import { ContainerCreateOptions } from 'dockerode';

/**
 * Opciones para crear una red Docker
 */
export interface NetworkCreateOptions {
  /** Nombre de la red */
  name: string;
  /** Subred en formato CIDR (ej. "172.20.0.0/16") */
  subnet: string;
  /** Etiquetas para la red */
  labels?: Record<string, string>;
}

/**
 * Opciones para crear un contenedor Docker
 */
export interface ContainerOptions extends Omit<ContainerCreateOptions, 'name'> {
  /** Nombre del contenedor */
  name: string;
  /** Dirección IP específica para el contenedor (opcional) */
  ip?: string;
  /** Nombre de la red a la que conectar el contenedor */
  networkName?: string;
}

/**
 * Información de una red Docker
 */
export interface NetworkInfo {
  /** ID de la red */
  id: string;
  /** Nombre de la red */
  name: string;
  /** Configuración de la red */
  config: {
    subnet?: string;
    gateway?: string;
  };
  /** Contenedores conectados a la red */
  containers: {
    id: string;
    name: string;
    ip?: string;
  }[];
}

/**
 * Información de un contenedor Docker
 */
export interface ContainerInfo {
  /** ID del contenedor */
  id: string;
  /** Nombre del contenedor */
  name: string;
  /** Estado del contenedor */
  state: string;
  /** Redes a las que está conectado el contenedor */
  networks: {
    name: string;
    ip?: string;
  }[];
} 