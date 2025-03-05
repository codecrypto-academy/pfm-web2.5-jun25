** Script de automatizacion de redes de blockchain con hyperledger besu **

Debemos desarrollar un script que permita crear una red de blockchain con hyperledger besu.

Los pasos son los siguientes:

1. crear un directorio para meter los archivos de la red.
2. crear una docker network para la red.
3. crear una clave privada para el bootnode.
   1. Esta clave sirve para obtener la public key del bootnode.
   2. La public key sirve para obtener el enode
   3. Estos ficheros los meteremos en el directorio bootnode dentro del directorio de la red.
4. Crear una clave privada para el nodo miner.
   1. Esta clave sirve para obtener el address del nodo miner.
   3. Estos ficheros los meteremos en el directorio miner dentro del directorio de la red.
5. Crear con docker el bootnode.
   1. Los datos los meteremos en el directorio bootnode/data
6. Crear con docker el nodo miner.
   1. Los datos los meteremos en el directorio miner/data
7. Crear varios nodos rpc.
   1. Los datos los meteremos en el directorio rpcxxxx/data siendo xxxx el port del nodo.
8. Transferencias.

   1. Usaremos en mnemonic para transferir 
   Mnemonic:          test test test test test test test test test test test junk
   Derivation path:   m/44'/60'/0'/0/0
   2. Transferiremos funds a las 10 primeras cuentas de este mnenomic.
   
9. Comprobacion de las transferencias.
   1. Crearemos en metamask una cuenta con el mnemonic.
   2. Comprobaremos que las 10 primeras cuentas tienen fondos.
