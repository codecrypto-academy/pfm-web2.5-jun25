// hooks/useNetworks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { besuAPI, NetworkCreateOptions } from '@/lib/api'

// Hook para obtener todas las redes - SE EJECUTA AUTOMÁTICAMENTE
export function useNetworks() {
  return useQuery({
    queryKey: ['networks'],           // ID único para el caché
    queryFn: () => besuAPI.getNetworks(), // Función que hace la llamada
    refetchInterval: 5000,            // Refresh cada 5 segundos
  })
}

// Hook para crear una red - SE EJECUTA MANUALMENTE
export function useCreateNetwork() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: NetworkCreateOptions) => besuAPI.createNetwork(data),
    onSuccess: () => {
      // Cuando se crea exitosamente, actualiza la lista
      queryClient.invalidateQueries({ queryKey: ['networks'] })
      console.log('Red creada exitosamente')
    },
    onError: (error: Error) => {
      console.error('Error al crear red:', error.message)
    },
  })
}

// Hook para eliminar una red - SE EJECUTA MANUALMENTE  
export function useDeleteNetwork() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => besuAPI.deleteNetwork(id),
    onSuccess: () => {
      // Cuando se elimina exitosamente, actualiza la lista
      queryClient.invalidateQueries({ queryKey: ['networks'] })
      console.log('Red eliminada exitosamente')
    },
    onError: (error: Error) => {
      console.error('Error al eliminar red:', error.message)
    },
  })
}