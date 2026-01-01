/**
 * Server Actions - Índice centralizado
 *
 * Este archivo exporta todas las Server Actions del proyecto
 * organizadas por dominio para facilitar su importación.
 */

// Productos
export {
  getProductos,
  getProductoById,
  searchProductos,
  getProductosPorCategoria,
  getProductosPorGenero,
  checkStock,
} from "./productos"

// Autenticación
export {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  changePassword,
} from "./auth"

// Pedidos
export {
  createCheckout,
  getPedidoById,
  getPedidosByUserId,
  updatePedidoEstado,
  confirmarPagoPedido,
  cancelarPedido,
} from "./pedidos"

// Admin
export {
  adminGetProductos,
  adminCreateProducto,
  adminUpdateProducto,
  adminDeleteProducto,
  adminGetPedidos,
  adminUpdatePedidoEstado,
  adminDeletePedido,
  adminGetStats,
  adminGetAdvancedStats,
  adminGetUsers,
  adminUpdateUserRole,
} from "./admin"
