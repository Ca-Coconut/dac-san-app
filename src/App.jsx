import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  requestLocationPermission,
  requestStoragePermission,
  getCurrentLocation,
  isNativeApp,
} from './permissions';
import {
  Search,
  MapPin,
  ShoppingCart,
  Star,
  Heart,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Fish,
  Droplet,
  Coffee,
  Leaf,
  Wine,
  Apple,
  Package,
  User,
  Store,
  Bell,
  Check,
  Trash2,
  ArrowLeft,
  Filter,
  SlidersHorizontal,
  CreditCard,
  Truck,
  ClipboardList,
  LogIn,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Settings,
  Edit,
  Save,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Pencil,
  Trash,
  Home,
  Phone,
  Clock,
  Send,
  TrendingUp,
  Wallet,
  BarChart3,
  Trophy,
  Gift,
  Zap,
  Users,
  MessageCircle,
  Copy,
  Image,
  ShieldCheck,
  Share2,
  Quote,
  IceCream,
  Cookie,
  Candy,
  Sprout,
  Beef,
  Milk,
  Utensils,
  ShoppingBasket,
  Salad,
  Cherry,
  Grape,
  Citrus,
  Flower2,
  Popcorn,
  Soup,
  Pizza,
  Sandwich,
  CakeSlice,
  Croissant,
  Beer,
  GlassWater,
  Carrot,
  Drumstick,
  Ham,
} from 'lucide-react';

// ✅ THÊM VÀO ĐÂY (sau import, trước const C)
const USER_DATA = {
  admin: {
    id: 'admin',
    email: 'admin@vimieng.com',
    password: 'admin123',
    role: 'admin',
    name: 'Admin',
    avatar: 'A',
  },
  user: {
    id: 'user1',
    email: 'thao.nguyen@email.com',
    password: 'user123',
    role: 'user',
    name: 'Thảo Nguyễn',
    avatar: 'T',
  },
};

// ✅ THÊM STORES VÀO ĐÂY (sau USER_DATA, trước const C)
const STORES = [
  {
    id: 1,
    name: 'Vị Miền Phan Thiết',
    addr: '12 Nguyễn Tất Thành, TP. Phan Thiết',
    region: 'Phan Thiết',
    lat: 10.9289,
    lng: 108.1013,
  },
  {
    id: 2,
    name: 'Vị Miền Mũi Né',
    addr: '88 Nguyễn Đình Chiểu, Mũi Né',
    region: 'Mũi Né',
    lat: 10.9336,
    lng: 108.2853,
  },
  {
    id: 3,
    name: 'Vị Miền Đà Lạt',
    addr: '15 Trần Phú, Đà Lạt',
    region: 'Lâm Đồng',
    lat: 11.9404,
    lng: 108.4583,
  },
];

// ===== PHÍ VẬN CHUYỂN THEO KHOẢNG CÁCH =====
// Tính khoảng cách đường chim bay (km) giữa 2 toạ độ bằng công thức Haversine.
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Tìm khoảng cách (km) từ 1 vị trí (chuỗi "lat,lng") đến cửa hàng gần nhất trong hệ thống.
// Trả về null nếu chưa xác định được vị trí (chưa cấp quyền / chưa lấy được GPS).
const getNearestStoreDistanceKm = (locationStr) => {
  if (!locationStr) return null;
  const parts = locationStr.split(',').map((n) => parseFloat(n));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  const [lat, lng] = parts;
  const distances = STORES.map((s) => distanceKm(lat, lng, s.lat, s.lng));
  return Math.min(...distances);
};

// Phí giao hàng tiêu chuẩn theo bậc khoảng cách (đ) — càng xa cửa hàng, phí càng cao.
const STANDARD_SHIPPING_TIERS = [
  { maxKm: 5, fee: 15000 },
  { maxKm: 10, fee: 25000 },
  { maxKm: 20, fee: 35000 },
  { maxKm: Infinity, fee: 50000 },
];
// Phí giao hàng hoả tốc = phí tiêu chuẩn + phụ thu ưu tiên, luôn cao hơn giao thường.
const EXPRESS_SHIPPING_SURCHARGE = 20000;
// Phí mặc định khi chưa xác định được vị trí (chưa bật định vị) — áp mức trung bình.
const DEFAULT_SHIPPING_FEE = { standard: 25000, express: 45000 };

const getShippingFee = (distKm, method) => {
  let standardFee;
  if (distKm == null) {
    standardFee = DEFAULT_SHIPPING_FEE.standard;
  } else {
    const tier = STANDARD_SHIPPING_TIERS.find((t) => distKm <= t.maxKm);
    standardFee = tier.fee;
  }
  return method === 'express' ? standardFee + EXPRESS_SHIPPING_SURCHARGE : standardFee;
};

// ===== ƯU ĐÃI PHÍ SHIP KHI MUA NHIỀU LOẠI SẢN PHẨM =====
// Khuyến khích khách mua nhiều đặc sản khác nhau trong 1 đơn: mua càng nhiều loại sản phẩm
// (không tính số lượng từng món), phí ship càng được giảm nhiều. Sắp xếp từ cao xuống thấp
// để find() luôn khớp đúng bậc cao nhất mà khách đạt được.
const MULTI_PRODUCT_SHIPPING_DISCOUNT_TIERS = [
  { minProducts: 5, percent: 0.4 }, // từ 5 loại sản phẩm trở lên: giảm 40% phí ship
  { minProducts: 3, percent: 0.25 }, // từ 3-4 loại sản phẩm: giảm 25% phí ship
  { minProducts: 2, percent: 0.1 }, // từ 2 loại sản phẩm: giảm 10% phí ship
];

const getMultiProductShippingDiscountPercent = (distinctProductCount) => {
  const tier = MULTI_PRODUCT_SHIPPING_DISCOUNT_TIERS.find(
    (t) => distinctProductCount >= t.minProducts
  );
  return tier ? tier.percent : 0;
};

// ===== GEOCODE ĐỊA CHỈ GIAO HÀNG (chữ) SANG TOẠ ĐỘ LAT/LNG =====
// Dùng địa chỉ khách gõ khi thanh toán làm nguồn xác định vị trí chính (thay vì GPS máy),
// vì GPS trên máy tính/trình duyệt thường lệch rất xa vị trí thật, còn địa chỉ gõ tay
// là nơi khách chắc chắn muốn giao hàng tới.
//
// Ưu tiên LocationIQ (miễn phí, không cần thẻ, 5.000 lượt/ngày, đăng ký chỉ cần email tại
// https://locationiq.com/register) vì độ chính xác tốt hơn Nominatim gốc.
// Nếu chưa điền LOCATIONIQ_API_KEY bên dưới, code tự động lùi về Nominatim (OpenStreetMap)
// miễn phí hoàn toàn, không cần đăng ký gì cả — để bạn vẫn test/dùng được ngay trong lúc chờ key.
const LOCATIONIQ_API_KEY = 'pk.57430d5d485e0410bd682da5e464f629';

const geocodeCache = new Map(); // cache theo địa chỉ đã chuẩn hoá, tránh gọi API lặp lại

const geocodeViaLocationIQ = async (addressText, signal) => {
  const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&format=json&limit=1&countrycodes=vn&normalizeaddress=1&q=${encodeURIComponent(
    addressText
  )}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data[0]) return null;
  return `${data[0].lat},${data[0].lon}`;
};

const geocodeViaNominatim = async (addressText, signal) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(
    addressText
  )}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data[0]) return null;
  return `${data[0].lat},${data[0].lon}`;
};

const geocodeAddress = async (addressText, signal) => {
  const key = addressText.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    let result = null;
    if (LOCATIONIQ_API_KEY) {
      // Đã có key LocationIQ → dùng làm nguồn chính, chính xác hơn Nominatim gốc.
      result = await geocodeViaLocationIQ(addressText, signal);
    }
    if (!result) {
      // Chưa có key, hoặc LocationIQ không tìm được (VD hết quota ngày) → lùi về Nominatim miễn phí.
      result = await geocodeViaNominatim(addressText, signal);
    }
    if (result) geocodeCache.set(key, result);
    return result;
  } catch (err) {
    if (err?.name !== 'AbortError') console.log('Lỗi geocode địa chỉ giao hàng:', err);
    return null;
  }
};

// ✅ THÊM IMPORT FIREBASE VÀO ĐÂY
import {
  saveOrderToFirebase,
  getOrdersByUser,
  getAllOrders,
  updateOrderStatusInFirebase,
  deleteOrderFromFirebase,
  getAllUsersFromFirebase,
  getUserByIdFromFirebase,
  findUserInFirebase,
  checkEmailExistsInFirebase,
  createUserInFirebase,
  updateUserInFirebase,
  ensureSeedUsers,
  getAllProductsFromFirebase,
  seedProductsIfEmpty,
  syncSampleProductsWithCode,
  getAllCategoriesFromFirebase,
  seedCategoriesIfEmpty,
  addCategoryToFirebase,
  updateCategoryInFirebase,
  deleteCategoryInFirebase,
  addProductToFirebase,
  updateProductInFirebase,
  deleteProductInFirebase,
  getBannerFromFirebase,
  saveBannerToFirebase,
  sendChatMessage,
  deleteChatMessage,
  subscribeToChatMessages,
  deleteChatConversation,
  saveReviewToFirebase,
  getReviewsByOrder,
  subscribeToProductReviews,
  subscribeToAllChats,
  subscribeToUserChat,
  markChatReadByAdmin,
  markChatReadByUser,
  TIERS,
  getTierInfo,
  awardPointsForOrder,
  getRewardsFromFirebase,
  addRewardToFirebase,
  updateRewardInFirebase,
  deleteRewardFromFirebase,
  redeemRewardInFirebase,
  getUserVouchersFromFirebase,
  markVoucherUsedInFirebase,
  subscribeToUserOrders,
  subscribeToAllOrders,
  subscribeToUserDoc,
  getFlashSalesFromFirebase,
  addFlashSaleToFirebase,
  updateFlashSaleInFirebase,
  deleteFlashSaleFromFirebase,
  subscribeToFlashSales,
  isFlashSaleActive,
  getDiscountedPrice,
  getUserByReferralCode,
  generateUniqueReferralCode,
  awardReferralBonus,
} from './firebase';
const C = {
  night: '#12333A',
  nightSoft: '#1B4550',
  brick: '#A5432B',
  brickSoft: '#C1603F',
  sand: '#E9DCC0',
  sandDeep: '#DCC89C',
  pine: '#4B6A45',
  pineSoft: '#6B8A62',
  dawn: '#E6A23C',
  paper: '#FBF7EF',
  ink: '#20262A',
  inkSoft: '#5C6660',
};
// Bảng icon dùng cho danh mục — lưu trên Firestore dưới dạng tên chuỗi (vd: "Fish"),
// map ngược sang component icon thật khi hiển thị.
const CAT_ICON_MAP = {
  Fish,
  Droplet,
  Coffee,
  Leaf,
  Wine,
  Apple,
  Package,
  IceCream,
  Cookie,
  Candy,
  Sprout,
  Beef,
  Milk,
  Utensils,
  ShoppingBasket,
  Salad,
  Cherry,
  Grape,
  Citrus,
  Flower2,
  Popcorn,
  Soup,
  Pizza,
  Sandwich,
  CakeSlice,
  Croissant,
  Beer,
  GlassWater,
  Carrot,
  Drumstick,
  Ham,
};
const CAT_ICON_OPTIONS = Object.keys(CAT_ICON_MAP);
// Bảng màu gợi ý để admin chọn khi tạo danh mục mới
const CAT_COLOR_OPTIONS = [
  '#12333A',
  '#A5432B',
  '#6B4A2C',
  '#4B6A45',
  '#6E2A3E',
  '#E6A23C',
  '#2C5F7A',
  '#7A4B6E',
  '#3C6E4B',
  '#8A5A2C',
];
// Danh mục mặc định — dùng để khởi tạo Firestore lần đầu (giống cơ chế INITIAL_PRODUCTS)
const DEFAULT_CATS = [
  { id: 'haisan', name: 'Hải sản khô', icon: 'Fish', region: 'Phan Thiết · Mũi Né', color: '#12333A' },
  { id: 'nuocmam', name: 'Nước mắm', icon: 'Droplet', region: 'Phan Thiết', color: '#A5432B' },
  { id: 'cafe', name: 'Cà phê', icon: 'Coffee', region: 'Lâm Đồng', color: '#6B4A2C' },
  { id: 'tra', name: 'Trà', icon: 'Leaf', region: 'Lâm Đồng', color: '#4B6A45' },
  { id: 'ruouvang', name: 'Rượu vang', icon: 'Wine', region: 'Lâm Đồng', color: '#6E2A3E' },
  { id: 'dautay', name: 'Đặc sản Lâm Đồng', icon: 'Apple', region: 'Lâm Đồng', color: '#E6A23C' },
];
// Danh sách danh mục "đang chạy" (được cập nhật từ Firestore lúc App tải dữ liệu).
// Khai báo ở module-scope để iconFor/catColor bên dưới luôn tra cứu được danh mục mới nhất,
// kể cả những danh mục do admin tự tạo/đổi tên, mà không cần truyền categories qua props ở
// hàng chục nơi trong file.
let RUNTIME_CATS = DEFAULT_CATS;
const INITIAL_PRODUCTS = [
  // ===== HẢI SẢN KHÔ - MŨI NÉ & PHAN THIẾT =====
  {
    id: 1,
    name: 'Mực một nắng Mũi Né',
    cat: 'haisan',
    region: 'Mũi Né',
    price: 285000,
    unit: '500g',
    rating: 4.8,
    reviews: 132,
    origin: 'Làng chài Mũi Né, Phan Thiết',
    desc: 'Mực câu tự nhiên, phơi một nắng theo cách truyền thống của ngư dân Mũi Né, thịt dai ngọt, nướng lên dậy mùi biển.',
    story: 'Trước lúc bình minh, thuyền thúng của ngư dân Mũi Né đã cập bến với những con mực còn tươi roi rói. Mực được rửa sạch bằng nước biển, phơi đúng một nắng trên giàn tre ven bãi để giữ trọn vị ngọt tự nhiên — công thức được truyền qua ba thế hệ trong làng chài.',
    stock: true,
    image: '/images/products/haisan/muc-mot-nang.jpg'
  },
  {
    id: 2,
    name: 'Cá cơm khô Phan Thiết',
    cat: 'haisan',
    region: 'Phan Thiết',
    price: 120000,
    unit: '300g',
    rating: 4.6,
    reviews: 88,
    origin: 'Cảng cá Phan Thiết',
    desc: 'Cá cơm loại nhỏ, sấy khô tự nhiên, giữ trọn vị ngọt để kho tiêu hoặc chiên giòn.',
    story: 'Mỗi mùa cá cơm về, cả bến cảng Phan Thiết rộn ràng từ tờ mờ sáng. Những mẻ cá cơm nhỏ nhất, tươi nhất được các mẹ, các chị chọn riêng để sấy khô tự nhiên dưới nắng gió miền biển, không qua bất kỳ công đoạn công nghiệp nào.',
    stock: true,
    image: '/images/products/haisan/ca-com-kho.jpg'
  },
  {
    id: 3,
    name: 'Tôm khô Mũi Né loại 1',
    cat: 'haisan',
    region: 'Mũi Né',
    price: 420000,
    unit: '300g',
    rating: 4.9,
    reviews: 64,
    origin: 'Vựa tôm Mũi Né',
    desc: 'Tôm đất tự nhiên, size lớn đều, màu đỏ cam đẹp mắt, ngọt thịt tự nhiên không tẩm hoá chất.',
    story: 'Tôm đất được đánh bắt bằng lưới thủ công ở vựa tôm Mũi Né, nơi con nước lợ giao thoa tạo nên vị ngọt đặc trưng không nơi nào có được. Người dân nơi đây vẫn giữ cách phơi tôm hoàn toàn tự nhiên như cha ông từng làm, không tẩm ướp hóa chất bảo quản.',
    stock: true,
    image: '/images/products/haisan/tom-kho.jpg'
  },
  {
    id: 13,
    name: 'Bánh tráng nướng mắm ruốc Mũi Né',
    cat: 'haisan',
    region: 'Mũi Né',
    price: 55000,
    unit: '10 cái',
    rating: 4.5,
    reviews: 46,
    origin: 'Mũi Né, Phan Thiết',
    desc: 'Bánh tráng nướng giòn phết mắm ruốc đặc trưng vùng biển, ăn vặt đưa tay.',
    story: 'Chiếc bánh tráng mỏng được nướng trên bếp than hồng ngay tại các con hẻm nhỏ Mũi Né, tay người thợ thoăn thoắt phết lớp mắm ruốc thơm lừng lên mặt bánh. Đây là món ăn vặt gắn liền tuổi thơ của bao thế hệ trẻ em vùng biển.',
    stock: true,
    image: '/images/products/haisan/banh-trang.jpg'
  },
  {
    id: 15,
    name: 'Cá đù khô Mũi Né',
    cat: 'haisan',
    region: 'Mũi Né',
    price: 180000,
    unit: '500g',
    rating: 4.4,
    reviews: 35,
    origin: 'Làng chài Mũi Né',
    desc: 'Cá đù tươi ngon, phơi khô tự nhiên, giữ được vị ngọt đặc trưng của biển cả, thích hợp kho hoặc chiên.',
    story: 'Cá đù được ngư dân làng chài Mũi Né đánh bắt trong những chuyến ra khơi ngắn ngày, khi cá còn tươi nguyên mới được đem phơi khô ngay trên bãi cát để giữ trọn hương vị biển cả trong từng thớ thịt.',
    stock: true,
    image: '/images/products/haisan/ca-du-kho.jpg'
  },
  {
    id: 16,
    name: 'Ruốc khô Phan Thiết',
    cat: 'haisan',
    region: 'Phan Thiết',
    price: 75000,
    unit: '200g',
    rating: 4.3,
    reviews: 28,
    origin: 'Phan Thiết',
    desc: 'Ruốc khô nguyên chất, không tạp chất, dùng để nấu canh hoặc làm mắm ruốc đặc trưng.',
    story: 'Từng mẻ ruốc nhỏ li ti được vớt lên từ vùng biển Phan Thiết, phơi khô tự nhiên theo phương pháp gia truyền của các hộ dân làm nghề biển lâu đời, không pha trộn tạp chất để giữ đúng vị ruốc nguyên bản.',
    stock: true,
    image: '/images/products/haisan/ruoc-kho.jpg'
  },
  {
    id: 17,
    name: 'Cá ngừ khô Phan Thiết',
    cat: 'haisan',
    region: 'Phan Thiết',
    price: 250000,
    unit: '500g',
    rating: 4.6,
    reviews: 52,
    origin: 'Cảng cá Phan Thiết',
    desc: 'Cá ngừ đại dương, phơi khô tự nhiên, thịt chắc, ngọt, thường dùng để nấu canh hoặc kho tiêu.',
    story: 'Những con cá ngừ đại dương được các tàu cá xa bờ mang về cảng cá Phan Thiết sau nhiều ngày lênh đênh trên biển. Phần thịt chắc nhất được chọn lọc kỹ càng, phơi khô tự nhiên để lưu giữ vị ngọt đậm đà của đại dương.',
    stock: true,
    image: '/images/products/haisan/ca-ngu-kho.jpg'
  },
  {
    id: 18,
    name: 'Chả mực Mũi Né',
    cat: 'haisan',
    region: 'Mũi Né',
    price: 150000,
    unit: '300g',
    rating: 4.7,
    reviews: 73,
    origin: 'Mũi Né, Phan Thiết',
    desc: 'Chả mực thơm ngon, làm từ mực tươi, giã tay, không chất bảo quản, có thể chiên hoặc hấp.',
    story: 'Mực tươi vừa cập bến được các nghệ nhân Mũi Né giã tay từng mẻ trong chiếc cối đá cũ, công đoạn đòi hỏi sức lực và kinh nghiệm để chả mực có độ dai giòn đặc trưng mà máy móc không thể thay thế được.',
    stock: true,
    image: '/images/products/haisan/cha-muc.jpg'
  },
  {
    id: 31,
    name: 'Hạt điều Mũi Né rang muối',
    cat: 'haisan',
    region: 'Mũi Né',
    price: 90000,
    unit: '300g',
    rating: 4.5,
    reviews: 76,
    origin: 'Mũi Né, Phan Thiết',
    desc: 'Hạt điều rang muối giòn thơm, ăn vặt bổ dưỡng, thích hợp làm quà biếu.',
    story: 'Hạt điều được tuyển chọn từ những vườn điều ven biển Mũi Né, rang trên chảo gang cùng muối biển tự nhiên theo lửa nhỏ để hạt chín đều, giòn thơm mà không bị cháy khét — món quà quê giản dị nhưng đầy tâm huyết.',
    stock: true,
    image: '/images/products/haisan/hat-dieu.jpg'
  },

  // ===== NƯỚC MẮM - PHAN THIẾT =====
  {
    id: 4,
    name: 'Nước mắm nhĩ cá cơm 40 độ đạm',
    cat: 'nuocmam',
    region: 'Phan Thiết',
    price: 95000,
    unit: '500ml',
    rating: 4.9,
    reviews: 210,
    origin: 'Làng nghề nước mắm Phan Thiết',
    desc: 'Ủ chượp 12 tháng trong thùng gỗ theo phương pháp gia truyền, cho ra nước mắm nhĩ đầu vàng sánh, đậm đà.',
    story: 'Trong những thùng gỗ bời lời hàng chục năm tuổi tại làng nghề nước mắm Phan Thiết, cá cơm than và muối biển được ủ chượp ròng rã 12 tháng. Giọt nước mắm nhĩ đầu tiên chảy ra vàng sánh như mật, kết tinh từ nắng gió và sự kiên nhẫn của người làm nghề cha truyền con nối.',
    stock: true,
    image: '/images/products/nuocmam/nuoc-mam-nhi.jpg'
  },
  {
    id: 5,
    name: 'Nước mắm cốt Phan Thiết đặc biệt',
    cat: 'nuocmam',
    region: 'Phan Thiết',
    price: 150000,
    unit: '650ml',
    rating: 4.7,
    reviews: 97,
    origin: 'Hàm Tiến, Phan Thiết',
    desc: 'Dòng nước mắm cốt cao đạm, dành cho người sành ăn, chấm hoặc kho đều dậy mùi thơm đặc trưng.',
    story: 'Được chắt lọc từ những mẻ chượp đầu tiên tại Hàm Tiến, dòng nước mắm cốt cao đạm này là tâm huyết của những gia đình làm nghề mắm lâu đời, chỉ dành riêng cho những ai thực sự sành vị mắm truyền thống.',
    stock: true,
    image: '/images/products/nuocmam/nuoc-mam-cot.jpg'
  },
  {
    id: 14,
    name: 'Nước mắm chay nấm hương',
    cat: 'nuocmam',
    region: 'Phan Thiết',
    price: 68000,
    unit: '500ml',
    rating: 4.3,
    reviews: 27,
    origin: 'Phan Thiết',
    desc: 'Nước chấm chay từ nấm hương, mặn ngọt hài hoà cho người ăn chay.',
    story: 'Ra đời từ mong muốn mang hương vị đậm đà của nước mắm truyền thống đến với người ăn chay, loại nước chấm này được nấu hoàn toàn từ nấm hương và nguyên liệu thực vật, giữ được vị mặn ngọt hài hòa quen thuộc.',
    stock: true,
    image: '/images/products/nuocmam/nuoc-mam-chay.jpg'
  },
  {
    id: 19,
    name: 'Nước mắm Mũi Né truyền thống',
    cat: 'nuocmam',
    region: 'Phan Thiết',
    price: 85000,
    unit: '750ml',
    rating: 4.5,
    reviews: 156,
    origin: 'Làng chài Mũi Né',
    desc: 'Nước mắm ủ từ cá cơm than, thời gian ủ 9 tháng, màu vàng rơm, hương thơm đặc trưng của biển.',
    story: 'Cá cơm than được ngư dân làng chài Mũi Né chọn lọc kỹ ngay khi thuyền vừa cập bến, ủ trong 9 tháng theo cách làm truyền thống của cha ông để cho ra loại nước mắm vàng rơm, mang trọn hương vị biển quê nhà.',
    stock: true,
    image: '/images/products/nuocmam/nuoc-mam-mui-ne.jpg'
  },
  {
    id: 20,
    name: 'Mắm nêm Phan Thiết',
    cat: 'nuocmam',
    region: 'Phan Thiết',
    price: 55000,
    unit: '500ml',
    rating: 4.2,
    reviews: 45,
    origin: 'Phan Thiết',
    desc: 'Mắm nêm đặc sản, lên men từ cá cơm và thính, vị mặn ngọt hài hòa, ăn kèm bún thịt nướng.',
    story: 'Mắm nêm Phan Thiết được lên men tự nhiên từ cá cơm tươi và thính rang thơm theo bí quyết riêng của từng gia đình làm mắm, tạo nên hương vị mặn ngọt hài hòa không thể thiếu trong mâm bún thịt nướng của người miền biển.',
    stock: true,
    image: '/images/products/nuocmam/mam-nem.jpg'
  },

  // ===== CÀ PHÊ - LÂM ĐỒNG =====
  {
    id: 6,
    name: 'Cà phê Arabica Cầu Đất',
    cat: 'cafe',
    region: 'Lâm Đồng',
    price: 175000,
    unit: '250g',
    rating: 4.8,
    reviews: 156,
    origin: 'Cầu Đất, Đà Lạt',
    desc: 'Trồng ở độ cao 1.500m, rang mộc giữ vị chua thanh trái cây đặc trưng của vùng Cầu Đất.',
    story: 'Trên những sườn đồi Cầu Đất cao 1.500m so với mực nước biển, nơi sương mù bao phủ quanh năm, từng trái cà phê Arabica chín đỏ được hái tay và rang mộc thủ công để giữ trọn vị chua thanh trái cây đặc trưng chỉ vùng đất này mới có.',
    stock: true,
    image: '/images/products/cafe/arabica.jpg'
  },
  {
    id: 7,
    name: 'Cà phê Robusta rang mộc',
    cat: 'cafe',
    region: 'Lâm Đồng',
    price: 130000,
    unit: '500g',
    rating: 4.6,
    reviews: 121,
    origin: 'Bảo Lộc, Lâm Đồng',
    desc: 'Hạt Robusta chọn lọc, rang mộc không tẩm bơ đường, vị đậm đắng truyền thống, hợp gu cà phê phin.',
    story: 'Từ những nông trại lâu đời ở Bảo Lộc, hạt Robusta được chọn lọc kỹ càng và rang mộc hoàn toàn tự nhiên, không tẩm bơ đường như cách pha chế công nghiệp, giữ nguyên vị đậm đắng truyền thống của ly cà phê phin Việt Nam.',
    stock: true,
    image: '/images/products/cafe/robusta.jpg'
  },
  {
    id: 21,
    name: 'Cà phê Moka Đà Lạt',
    cat: 'cafe',
    region: 'Lâm Đồng',
    price: 220000,
    unit: '250g',
    rating: 4.9,
    reviews: 89,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Cà phê Moka cao cấp, rang vừa, hương thơm nồng, vị chua nhẹ, hậu vị ngọt tự nhiên.',
    story: 'Moka là giống cà phê quý hiếm và khó trồng bậc nhất, chỉ phát triển tốt trên vùng đất cao Đà Lạt. Người nông dân phải chăm chút tỉ mỉ từng gốc cây để cho ra những hạt cà phê thơm nồng, hậu vị ngọt tự nhiên hiếm có.',
    stock: true,
    image: '/images/products/cafe/moka.jpg'
  },
  {
    id: 22,
    name: 'Cà phê sữa đá Đà Lạt',
    cat: 'cafe',
    region: 'Lâm Đồng',
    price: 95000,
    unit: '300g',
    rating: 4.5,
    reviews: 67,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Cà phê pha sẵn kiểu Đà Lạt, sữa đặc nguyên chất, thơm béo, tiện lợi pha nhanh.',
    story: 'Lấy cảm hứng từ ly cà phê sữa đá quen thuộc trên phố núi Đà Lạt mỗi sáng sớm, sản phẩm được pha chế sẵn từ cà phê rang mộc và sữa đặc nguyên chất, mang hương vị phố núi đến gần hơn với mọi gia đình.',
    stock: true,
    image: '/images/products/cafe/cafe-sua-da.jpg'
  },

  // ===== TRÀ - LÂM ĐỒNG =====
  {
    id: 8,
    name: 'Trà Ô Long Cầu Đất',
    cat: 'tra',
    region: 'Lâm Đồng',
    price: 210000,
    unit: '200g',
    rating: 4.7,
    reviews: 74,
    origin: 'Cầu Đất, Đà Lạt',
    desc: 'Búp trà một tôm hai lá, lên men bán phần, hương hoa nhẹ, hậu vị ngọt kéo dài.',
    story: 'Trên những đồi trà Cầu Đất sương phủ quanh năm, người hái trà chỉ chọn đúng búp một tôm hai lá non nhất vào sáng sớm, khi còn đọng sương. Trà được lên men bán phần theo kỹ thuật Ô Long truyền thống để giữ trọn hương hoa và hậu vị ngọt kéo dài.',
    stock: true,
    image: '/images/products/tra/tra-o-long.jpg'
  },
  {
    id: 9,
    name: 'Trà Atiso Đà Lạt sấy khô',
    cat: 'tra',
    region: 'Lâm Đồng',
    price: 65000,
    unit: '200g',
    rating: 4.5,
    reviews: 143,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Hoa atiso sấy lạnh giữ dưỡng chất, thanh nhiệt mát gan, pha trà uống mỗi ngày.',
    story: 'Atiso vốn được xem là dược liệu quý của cao nguyên Đà Lạt, từng bông hoa được thu hái đúng độ chín rồi sấy lạnh ngay để giữ nguyên dưỡng chất — một thức uống mà người Đà Lạt vẫn pha mỗi ngày để thanh nhiệt, mát gan.',
    stock: true,
    image: '/images/products/tra/tra-atiso.jpg'
  },
  {
    id: 23,
    name: 'Trà Shan Tuyết Đà Lạt',
    cat: 'tra',
    region: 'Lâm Đồng',
    price: 180000,
    unit: '200g',
    rating: 4.6,
    reviews: 58,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Trà Shan Tuyết cổ thụ, búp trà trắng phủ tuyết, vị chát nhẹ, hậu ngọt sâu.',
    story: 'Từ những gốc trà Shan Tuyết cổ thụ hàng chục năm tuổi mọc trên triền núi cao Đà Lạt, búp trà non phủ lớp lông tơ trắng như tuyết được hái tay tỉ mỉ, chế biến thủ công để lưu giữ vị chát nhẹ và hậu ngọt sâu lắng đặc trưng.',
    stock: true,
    image: '/images/products/tra/tra-shan-tuyet.jpg'
  },
  {
    id: 24,
    name: 'Trà hoa hồng Đà Lạt',
    cat: 'tra',
    region: 'Lâm Đồng',
    price: 85000,
    unit: '150g',
    rating: 4.4,
    reviews: 42,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Trà hòa quyện với hoa hồng Đà Lạt, hương thơm dịu nhẹ, màu sắc đẹp mắt.',
    story: 'Những cánh hồng Đà Lạt tươi thắm được ướp cùng trà xanh theo phương pháp thủ công, để hương hoa dịu nhẹ thấm đều vào từng lá trà, tạo nên thức uống vừa đẹp mắt vừa mang hơi thở lãng mạn của thành phố ngàn hoa.',
    stock: true,
    image: '/images/products/tra/tra-hoa-hong.jpg'
  },

  // ===== RƯỢU VANG - LÂM ĐỒNG =====
  {
    id: 10,
    name: 'Rượu vang Đà Lạt dâu tằm',
    cat: 'ruouvang',
    region: 'Lâm Đồng',
    price: 145000,
    unit: '750ml',
    rating: 4.4,
    reviews: 58,
    origin: 'Xưởng vang Đà Lạt',
    desc: 'Lên men từ dâu tằm Đà Lạt, vị chua ngọt hài hoà, nồng độ nhẹ dễ uống.',
    story: 'Dâu tằm chín mọng từ những vườn cây lâu năm ở Đà Lạt được xưởng vang địa phương lên men tự nhiên theo phương pháp thủ công, cho ra loại rượu vang có vị chua ngọt hài hòa, nồng độ nhẹ, dễ uống cho cả những người mới thử.',
    stock: true,
    image: '/images/products/ruouvang/ruou-vang-dau-tam.jpg'
  },
  {
    id: 25,
    name: 'Rượu vang Đà Lạt mận',
    cat: 'ruouvang',
    region: 'Lâm Đồng',
    price: 165000,
    unit: '750ml',
    rating: 4.5,
    reviews: 43,
    origin: 'Xưởng vang Đà Lạt',
    desc: 'Rượu vang mận Đà Lạt, vị chua thanh, hương mận chín, màu đỏ ruby đẹp.',
    story: 'Vào mùa mận chín rộ trên cao nguyên, những trái mận đỏ mọng nhất được xưởng vang Đà Lạt chọn lựa để lên men, giữ trọn hương mận chín tự nhiên và tạo nên sắc đỏ ruby đẹp mắt trong từng chai rượu.',
    stock: true,
    image: '/images/products/ruouvang/ruou-vang-man.jpg'
  },
  {
    id: 26,
    name: 'Rượu vang Đà Lạt nho',
    cat: 'ruouvang',
    region: 'Lâm Đồng',
    price: 195000,
    unit: '750ml',
    rating: 4.7,
    reviews: 67,
    origin: 'Xưởng vang Đà Lạt',
    desc: 'Rượu vang nho Đà Lạt, ủ từ nho tươi, vị đậm đà, hương thơm tự nhiên.',
    story: 'Nho tươi được trồng và thu hoạch ngay tại Đà Lạt, ủ lên men theo quy trình truyền thống của xưởng vang địa phương trong nhiều tháng để cho ra hương vị đậm đà, thơm tự nhiên không pha tạp hương liệu.',
    stock: true,
    image: '/images/products/ruouvang/ruou-vang-nho.jpg'
  },

  // ===== ĐẶC SẢN LÂM ĐỒNG =====
  {
    id: 11,
    name: 'Dâu tây Đà Lạt (hộp tươi)',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 95000,
    unit: '500g',
    rating: 4.7,
    reviews: 189,
    origin: 'Nông trại Đà Lạt',
    desc: 'Dâu tây giống Nhật, hái theo đơn, quả đỏ mọng, đóng hộp giữ lạnh khi giao.',
    story: 'Mỗi trái dâu tây giống Nhật tại nông trại Đà Lạt chỉ được hái khi có đơn đặt hàng, để đảm bảo độ tươi ngon tối đa khi đến tay khách. Dâu được đóng hộp và giữ lạnh ngay trong ngày thu hoạch — trọn vẹn vị ngọt mát của phố núi.',
    stock: true,
    image: '/images/products/dautay/dau-tay-tuoi.jpg'
  },
  {
    id: 12,
    name: 'Mứt dâu tây Đà Lạt',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 78000,
    unit: '280g',
    rating: 4.6,
    reviews: 92,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Nấu thủ công từ dâu tươi và đường mía, không chất bảo quản, ăn kèm bánh mì hoặc sữa chua.',
    story: 'Vào mỗi mùa dâu chín, các hộ gia đình ở Đà Lạt lại quây quần bên bếp lửa nhỏ, tự tay nấu mứt dâu từ những trái dâu tươi nhất cùng đường mía nguyên chất, không thêm chất bảo quản — giữ nguyên vị ngọt thanh tự nhiên của trái cây.',
    stock: true,
    image: '/images/products/dautay/mut-dau-tay.jpg'
  },
  {
    id: 27,
    name: 'Mứt gừng Đà Lạt',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 65000,
    unit: '250g',
    rating: 4.3,
    reviews: 35,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Mứt gừng thơm cay, ngọt dịu, dùng để chữa cảm hoặc làm quà biếu.',
    story: 'Củ gừng trồng trên đất đỏ bazan Đà Lạt được rửa sạch, thái lát mỏng rồi sên cùng đường theo cách làm mứt Tết cổ truyền của các bà, các mẹ — vừa thơm cay ấm bụng, vừa là món quà biếu ý nghĩa mỗi dịp lễ Tết.',
    stock: true,
    image: '/images/products/dautay/mut-gung.jpg'
  },
  {
    id: 28,
    name: 'Dâu tây sấy dẻo Đà Lạt',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 85000,
    unit: '200g',
    rating: 4.6,
    reviews: 56,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Dâu tây sấy dẻo, giữ nguyên vị ngọt tự nhiên, ăn vặt thơm ngon.',
    story: 'Những trái dâu tây chín mọng không đạt chuẩn xuất tươi được các cơ sở chế biến tại Đà Lạt tận dụng sấy dẻo ở nhiệt độ thấp trong nhiều giờ, giữ nguyên vị ngọt tự nhiên mà không lãng phí thành quả của người nông dân.',
    stock: true,
    image: '/images/products/dautay/dau-tay-say-deo.jpg'
  },
  {
    id: 29,
    name: 'Mứt cà rốt Đà Lạt',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 55000,
    unit: '300g',
    rating: 4.2,
    reviews: 28,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Mứt cà rốt đỏ, giòn ngọt, màu sắc đẹp mắt, dùng ăn kèm trà.',
    story: 'Cà rốt đỏ tươi từ vùng đất Đà Lạt được thái sợi, sên cùng đường theo công thức mứt truyền thống, giữ được độ giòn tự nhiên và sắc đỏ bắt mắt — món mứt quen thuộc trên bàn trà ngày Tết của người Việt.',
    stock: true,
    image: '/images/products/dautay/mut-ca-rot.jpg'
  },
  {
    id: 30,
    name: 'Bơ Đà Lạt (tươi)',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 120000,
    unit: '1kg',
    rating: 4.8,
    reviews: 112,
    origin: 'Nông trại Đà Lạt',
    desc: 'Bơ sáp Đà Lạt, quả to, thơm béo, xuất khẩu chất lượng cao.',
    story: 'Trên những triền đồi đất đỏ bazan Đà Lạt, cây bơ sáp được chăm sóc kỹ lưỡng qua nhiều năm mới cho quả to, thịt vàng béo ngậy. Đây là giống bơ đạt tiêu chuẩn xuất khẩu, được người nông dân tự hào giới thiệu ra thị trường quốc tế.',
    stock: true,
    image: '/images/products/dautay/bo-da-lat.jpg'
  },
  {
    id: 32,
    name: 'Măng tây Đà Lạt',
    cat: 'dautay',
    region: 'Lâm Đồng',
    price: 75000,
    unit: '500g',
    rating: 4.4,
    reviews: 43,
    origin: 'Đà Lạt, Lâm Đồng',
    desc: 'Măng tây tươi, trồng tại Đà Lạt, xanh mướt, giòn ngọt, dinh dưỡng cao.',
    story: 'Măng tây được trồng trên vùng đất khí hậu mát mẻ quanh năm của Đà Lạt, thu hoạch mỗi sáng sớm khi măng còn non và giòn nhất, giữ trọn vị ngọt thanh và giá trị dinh dưỡng cao trước khi đến tay người tiêu dùng.',
    stock: true,
    image: '/images/products/dautay/mang-tay.jpg'
  },
];

const iconFor = (cat) => {
  const found = RUNTIME_CATS.find((c) => c.id === cat);
  if (found) return CAT_ICON_MAP[found.icon] || Package;
  return (
    { haisan: Fish, nuocmam: Droplet, cafe: Coffee, tra: Leaf, ruouvang: Wine, dautay: Apple }[
      cat
    ] || Package
  );
};
const catColor = (cat) => {
  const found = RUNTIME_CATS.find((c) => c.id === cat);
  if (found && found.color) return found.color;
  return (
    {
      haisan: C.night,
      nuocmam: C.brick,
      cafe: '#6B4A2C',
      tra: C.pine,
      ruouvang: '#6E2A3E',
      dautay: C.dawn,
    }[cat] || C.inkSoft
  );
};
const money = (n) => n.toLocaleString('vi-VN') + '₫';

function WaveDivider({ flip }) {
  return (
    <svg
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      style={{
        width: '100%',
        height: 28,
        display: 'block',
        transform: flip ? 'scaleY(-1)' : 'none',
      }}
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.night} />
          <stop offset="45%" stopColor={C.brick} />
          <stop offset="75%" stopColor={C.dawn} />
          <stop offset="100%" stopColor={C.pine} />
        </linearGradient>
      </defs>
      <path
        d="M0,30 C150,60 350,0 600,30 C850,60 1050,0 1200,30 L1200,60 L0,60 Z"
        fill="url(#waveGrad)"
      />
    </svg>
  );
}

function Stars({ rating, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.round(rating) ? C.dawn : 'none'}
          stroke={C.dawn}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function Pill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        border: `1px solid ${active ? C.night : '#D8CFBB'}`,
        background: active ? C.night : 'transparent',
        color: active ? C.paper : C.ink,
        whiteSpace: 'nowrap',
        fontFamily: "'Be Vietnam Pro',sans-serif",
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  );
}

function AdminTabButton({ icon: Icon, children, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '9px 8px',
        borderRadius: 12,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        border: `1px solid ${active ? C.night : '#E3D9C2'}`,
        background: active ? C.night : '#fff',
        color: active ? C.paper : C.ink,
        fontFamily: "'Be Vietnam Pro',sans-serif",
        transition: 'all .15s',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
    >
      {Icon && <Icon size={15} style={{ flexShrink: 0 }} />}
      {children}
      {badge > 0 && (
        <span
          style={{
            background: C.brick,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 999,
            padding: '1px 6px',
            marginLeft: 2,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EAE1CC',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={color} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
        {value}
      </span>
      <span style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function RevenueBarChart({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.revenue));
  const fmtShort = (n) => {
    if (n <= 0) return '';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'tr';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return String(n);
  };
  return (
    <div
      className="hide-scroll"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        height: 170,
        padding: '10px 2px 0',
        overflowX: 'auto',
      }}
    >
      {buckets.map((b, i) => {
        const h = b.revenue > 0 ? Math.max(4, Math.round((b.revenue / max) * 120)) : 2;
        return (
          <div
            key={i}
            style={{
              flex: '1 0 32px',
              minWidth: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
            title={`${b.label}: ${money(b.revenue)}`}
          >
            <span style={{ fontSize: 9, color: C.inkSoft, fontWeight: 700 }}>
              {fmtShort(b.revenue)}
            </span>
            <div
              style={{
                width: '100%',
                maxWidth: 26,
                height: h,
                borderRadius: '6px 6px 2px 2px',
                background: `linear-gradient(180deg, ${C.dawn}, ${C.brick})`,
              }}
            />
            <span
              style={{
                fontSize: 9.5,
                color: C.inkSoft,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderTimeline({ status }) {
  const steps = [
    { key: 'Đang xử lý', label: 'Xác nhận', icon: '📝' },
    { key: 'Đang đóng gói', label: 'Đóng gói', icon: '📦' },
    { key: 'Đang giao', label: 'Đang giao', icon: '🚚' },
    { key: 'Đã giao', label: 'Đã giao', icon: '✅' },
  ];

  if (status === 'Đã hủy') {
    return (
      <div
        style={{
          background: '#f5f5f5',
          borderRadius: 10,
          padding: '12px',
          textAlign: 'center',
          color: '#999',
          fontWeight: 700,
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        ❌ Đơn hàng đã bị hủy
      </div>
    );
  }

  const currentIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === status)
  );

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 4px 18px' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 62,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: i <= currentIndex ? C.pine : '#EAE1CC',
                color: i <= currentIndex ? '#fff' : '#999',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i < currentIndex ? '✓' : s.icon}
            </div>
            <span
              style={{
                fontSize: 10.5,
                marginTop: 4,
                color: i <= currentIndex ? C.ink : C.inkSoft,
                fontWeight: i === currentIndex ? 700 : 500,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                marginTop: 14,
                background: i < currentIndex ? C.pine : '#EAE1CC',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProductCard({ p, onOpen, fav, onFav, onAdd, flashSales = [] }) {
  const Icon = iconFor(p.cat);
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #EAE1CC',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* ===== PHẦN HÌNH ẢNH ===== */}
      <div
        onClick={() => onOpen(p.id)}
        style={{
          cursor: 'pointer',
          height: 150,
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ✅ HIỂN THỊ ẢNH NẾU CÓ */}
        {p.image ? (
          <img
            src={p.image}
            alt={p.name}
            referrerPolicy="no-referrer"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
            onError={(e) => {
              // Nếu ảnh lỗi, ẩn ảnh và hiển thị icon
              e.target.style.display = 'none';
              const fallback = e.target.parentElement.querySelector('.fallback-icon');
              if (fallback) fallback.style.display = 'flex';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
        ) : null}

        {/* ✅ FALLBACK: HIỂN THỊ ICON KHI KHÔNG CÓ ẢNH HOẶC ẢNH LỖI */}
        <div
          className="fallback-icon"
          style={{
            display: p.image ? 'none' : 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${catColor(p.cat)}22, ${catColor(p.cat)}0a)`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <Icon size={50} color={catColor(p.cat)} strokeWidth={1.2} />
        </div>

        {/* === BADGE KHU VỰC === */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            zIndex: 2,
          }}
        >
          <MapPin size={10} /> {p.region}
        </div>

        {/* === NÚT YÊU THÍCH === */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFav(p.id);
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: '#fff',
            border: 'none',
            borderRadius: 999,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 2,
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Heart
            size={16}
            fill={fav ? C.brick : 'none'}
            stroke={fav ? C.brick : C.inkSoft}
            strokeWidth={fav ? 2 : 1.5}
          />
        </button>

        {/* === BADGE CÒN HÀNG / HẾT HÀNG === */}
        {p.stock === false && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: C.brick,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              zIndex: 2,
            }}
          >
            Hết hàng
          </div>
        )}
      </div>

      {/* ===== PHẦN THÔNG TIN SẢN PHẨM ===== */}
      <div
        style={{
          padding: '12px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flex: 1,
        }}
      >
        {/* Tên sản phẩm */}
        <div
          onClick={() => onOpen(p.id)}
          style={{
            cursor: 'pointer',
            fontFamily: "'Fraunces',serif",
            fontWeight: 600,
            fontSize: 15.5,
            color: C.ink,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {p.name}
        </div>

        {/* Đánh giá sao */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.inkSoft }}
        >
          <Stars rating={p.rating} />{' '}
          <span>
            {p.rating} ({p.reviews})
          </span>
        </div>

        {/* Giá và nút thêm vào giỏ */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 6,
          }}
        >
          <div>
            {(() => {
              const { finalPrice, discountPercent } = getDiscountedPrice(p, flashSales);
              if (discountPercent > 0) {
                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: C.brick, fontSize: 16 }}>
                        {money(finalPrice)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          background: C.brick,
                          padding: '1px 6px',
                          borderRadius: 999,
                        }}
                      >
                        -{discountPercent}%
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.inkSoft,
                        textDecoration: 'line-through',
                      }}
                    >
                      {money(p.price)}
                    </div>
                  </>
                );
              }
              return <div style={{ fontWeight: 700, color: C.brick, fontSize: 16 }}>{money(p.price)}</div>;
            })()}
            <div style={{ fontSize: 11, color: C.inkSoft }}>/ {p.unit}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(p.id);
            }}
            style={{
              background: C.night,
              color: C.paper,
              border: 'none',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: p.stock !== false ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              opacity: p.stock !== false ? 1 : 0.5,
              transition: 'transform 0.2s ease, background 0.2s ease',
            }}
            disabled={p.stock === false}
            onMouseEnter={(e) => {
              if (p.stock !== false) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = C.brick;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = C.night;
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // ===== TRẠNG THÁI MẠNG (hiện màn "Mất kết nối" khi app không có internet) =====
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [myLocation, setMyLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // ===== XIN QUYỀN VỊ TRÍ + BỘ NHỚ LÚC MỞ APP LẦN ĐẦU =====
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ location: null, storage: null });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  useEffect(() => {
    // Chỉ hỏi trên app Android thật, và chỉ hỏi 1 lần (trừ khi người dùng bấm "Để sau")
    const alreadyAsked = !!localStorage.getItem('dacsan_permissions_asked');
    if (isNativeApp() && !alreadyAsked) {
      setShowPermissionScreen(true);
      return; // Chờ người dùng bấm nút trên màn xin quyền, không tự lấy vị trí ở đây
    }
    // Đã từng hỏi quyền rồi (hoặc đang chạy web) — cứ thử lấy vị trí như bình thường,
    // nếu quyền đã được cấp từ trước thì lấy được luôn, không hiện lại hộp thoại nào cả.
    getCurrentLocation().then((loc) => {
      if (loc && typeof loc === 'string') setMyLocation(loc);
      else if (loc && loc.error) setLocationError(loc);
    });
  }, []);

  const handleGrantPermissions = async () => {
    setIsRequestingPermissions(true);
    const locationResult = await requestLocationPermission();
    const storageResult = await requestStoragePermission();
    setPermissionStatus({ location: locationResult, storage: storageResult });
    setIsRequestingPermissions(false);
    localStorage.setItem('dacsan_permissions_asked', '1');
    setShowPermissionScreen(false);
    // Sau khi có quyền, lấy vị trí ngay để hiện bản đồ/gợi ý gần bạn
    const loc = await getCurrentLocation();
    if (loc && typeof loc === 'string') setMyLocation(loc);
    else if (loc && loc.error) setLocationError(loc);
  };

  const handleSkipPermissions = () => {
    localStorage.setItem('dacsan_permissions_asked', '1');
    setShowPermissionScreen(false);
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerReferralCode, setRegisterReferralCode] = useState('');
  const [registerError, setRegisterError] = useState('');

  const [view, setView] = useState('home');
  const [productId, setProductId] = useState(null);
  const [cart, setCart] = useState([]);

  // Thêm vào sau các state khác

  const [showContact, setShowContact] = useState(false); // Khung chat với Admin (khách hàng)
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]); // Tin nhắn trong luồng chat của khách đang đăng nhập
  const [myChatMeta, setMyChatMeta] = useState(null); // Doc tóm tắt chat của khách (để biết unreadForUser)

  const [showBankTransfer, setShowBankTransfer] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [bankMethod, setBankMethod] = useState('qr'); // "qr" hoặc "bank"
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ===== ĐÁNH GIÁ SẢN PHẨM SAU KHI ĐÃ GIAO HÀNG =====
  const [reviewedKeysInOrder, setReviewedKeysInOrder] = useState(new Set()); // các "orderId_productId" đã đánh giá trong đơn đang xem
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { orderId, productId, productName }
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [productReviews, setProductReviews] = useState([]); // đánh giá thật của sản phẩm đang xem chi tiết

  const openReviewModal = (orderId, productId, productName) => {
    setReviewTarget({ orderId, productId, productName });
    setReviewStars(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!reviewTarget || !currentUser) return;
    if (isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      const ok = await saveReviewToFirebase({
        orderId: reviewTarget.orderId,
        productId: reviewTarget.productId,
        productName: reviewTarget.productName,
        userId: currentUser.id,
        userName: currentUser.name || 'Khách hàng',
        rating: reviewStars,
        comment: reviewComment.trim(),
      });
      if (ok) {
        setReviewedKeysInOrder(
          (prev) => new Set([...prev, `${reviewTarget.orderId}_${reviewTarget.productId}`])
        );
        showToast('Cảm ơn bạn đã đánh giá sản phẩm!');
        setShowReviewModal(false);
      } else {
        showToast('Có lỗi xảy ra, vui lòng thử lại');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };
  const [cancelReason, setCancelReason] = useState('');

  const [customerPhone, setCustomerPhone] = useState('');

  const [favs, setFavs] = useState(new Set());
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sort, setSort] = useState('popular');
  const [toast, setToast] = useState(null);

  // Xóa dữ liệu cứng này
  // const [orders, setOrders] = useState([...]);

  // Thay bằng:
  const [orders, setOrders] = useState([]);

  const [checkoutStep, setCheckoutStep] = useState(1);
  const [address, setAddress] = useState('12 Nguyễn Tất Thành, TP. Phan Thiết');

  // ===== TOẠ ĐỘ SUY RA TỪ ĐỊA CHỈ GIAO HÀNG (nguồn chính để tính phí ship) =====
  const [addressLocation, setAddressLocation] = useState(null); // "lat,lng" geocode từ chuỗi `address`
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [addressGeocodeFailed, setAddressGeocodeFailed] = useState(false);

  useEffect(() => {
    const trimmed = address.trim();
    // Địa chỉ quá ngắn thì chưa đủ để geocode chính xác — chờ khách gõ thêm.
    if (trimmed.length < 6) {
      setAddressLocation(null);
      setAddressGeocodeFailed(false);
      setIsGeocodingAddress(false);
      return;
    }
    const controller = new AbortController();
    setIsGeocodingAddress(true);
    // Debounce 800ms để không gọi API mỗi lần gõ 1 ký tự.
    const timer = setTimeout(async () => {
      const loc = await geocodeAddress(trimmed, controller.signal);
      setIsGeocodingAddress(false);
      if (loc) {
        setAddressLocation(loc);
        setAddressGeocodeFailed(false);
      } else {
        setAddressLocation(null);
        setAddressGeocodeFailed(true);
      }
    }, 800);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address]);
  const [payMethod, setPayMethod] = useState('cod');
  const [adminTab, setAdminTab] = useState('products');
  const [statsPeriod, setStatsPeriod] = useState('day'); // 'day' | 'week' | 'month' — cho tab Thống kê

  // ===== CHAT 2 CHIỀU (Admin) =====
  const [adminChats, setAdminChats] = useState([]); // Danh sách luồng chat của tất cả khách hàng
  const [activeChatUserId, setActiveChatUserId] = useState(null); // Khách đang được chọn để trả lời
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [adminChatInput, setAdminChatInput] = useState('');

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminAccountIds, setAdminAccountIds] = useState(new Set());

  useEffect(() => {
    if (currentUser?.role === 'admin' && adminTab === 'users') {
      getAllUsersFromFirebase().then(setAdminUsers);
    }
  }, [currentUser, adminTab]);

  // Lấy danh sách id của mọi tài khoản Admin (không phụ thuộc tab đang mở) để lọc bỏ khỏi
  // danh sách "Tin nhắn" — tránh trường hợp 1 luồng chat cũ do Admin tự nhắn cho chính mình
  // (từ trước khi nút "Chat với Admin" bị ẩn với tài khoản Admin) vẫn hiện lên như 1 khách hàng.
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    getAllUsersFromFirebase().then((list) => {
      setAdminAccountIds(new Set(list.filter((u) => u.role === 'admin').map((u) => u.firebaseId)));
    });
  }, [currentUser]);

  // (Admin) Đổi quyền Admin ⇄ Khách hàng cho 1 người dùng.
  // Không cho tự đổi quyền của chính mình, và không cho hạ cấp nếu đó là Admin cuối cùng
  // (tránh trường hợp không còn ai có quyền quản trị cửa hàng).
  const handleToggleUserRole = async (u) => {
    if (u.firebaseId === currentUser.firebaseId) {
      showToast('Không thể tự thay đổi quyền của chính mình');
      return;
    }
    const isDemotingLastAdmin =
      u.role === 'admin' && adminUsers.filter((x) => x.role === 'admin').length <= 1;
    if (isDemotingLastAdmin) {
      showToast('Không thể bỏ quyền Admin cuối cùng của cửa hàng');
      return;
    }
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    const ok = await updateUserInFirebase(u.firebaseId, { role: newRole });
    if (ok) {
      setAdminUsers((prev) =>
        prev.map((x) => (x.firebaseId === u.firebaseId ? { ...x, role: newRole } : x))
      );
      showToast(newRole === 'admin' ? `Đã cấp quyền Admin cho ${u.name}` : `Đã bỏ quyền Admin của ${u.name}`);
    } else {
      showToast('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  // (Admin) Khóa / Mở khóa tài khoản. Tài khoản bị khóa sẽ không đăng nhập được (xem handleLogin).
  const handleToggleUserBan = async (u) => {
    if (u.firebaseId === currentUser.firebaseId) {
      showToast('Không thể tự khóa tài khoản của chính mình');
      return;
    }
    const newStatus = u.status === 'banned' ? 'active' : 'banned';
    const ok = await updateUserInFirebase(u.firebaseId, { status: newStatus });
    if (ok) {
      setAdminUsers((prev) =>
        prev.map((x) => (x.firebaseId === u.firebaseId ? { ...x, status: newStatus } : x))
      );
      showToast(newStatus === 'banned' ? `Đã khóa tài khoản ${u.name}` : `Đã mở khóa tài khoản ${u.name}`);
    } else {
      showToast('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin' && adminTab === 'rewards') {
      getRewardsFromFirebase().then(setRewardsList);
    }
  }, [currentUser, adminTab]);

  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    pointsCost: '',
    discountType: 'fixed',
    discountValue: '',
  });

  const openAddRewardForm = () => {
    setEditingReward(null);
    setRewardForm({ name: '', pointsCost: '', discountType: 'fixed', discountValue: '' });
    setShowRewardModal(true);
  };

  const openEditRewardForm = (r) => {
    setEditingReward(r);
    setRewardForm({
      name: r.name,
      pointsCost: r.pointsCost,
      discountType: r.discountType,
      discountValue: r.discountValue || '',
    });
    setShowRewardModal(true);
  };

  const saveReward = async () => {
    if (!rewardForm.name.trim() || !rewardForm.pointsCost) {
      showToast('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const data = {
      name: rewardForm.name,
      pointsCost: Number(rewardForm.pointsCost),
      discountType: rewardForm.discountType,
      discountValue: Number(rewardForm.discountValue) || 0,
    };
    if (editingReward) {
      await updateRewardInFirebase(editingReward.firebaseId, data);
      setRewardsList((prev) =>
        prev.map((r) => (r.firebaseId === editingReward.firebaseId ? { ...r, ...data } : r))
      );
      showToast('Đã cập nhật quà tặng!');
    } else {
      const id = await addRewardToFirebase(data);
      setRewardsList((prev) => [...prev, { firebaseId: id, ...data }]);
      showToast('Đã thêm quà tặng!');
    }
    setShowRewardModal(false);
  };

  const removeReward = async (r) => {
    await deleteRewardFromFirebase(r.firebaseId);
    setRewardsList((prev) => prev.filter((x) => x.firebaseId !== r.firebaseId));
    showToast('Đã xoá quà tặng');
  };

  // ===== QUẢN LÝ FLASH SALE (ADMIN) =====
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState(null);
  const [flashSaleForm, setFlashSaleForm] = useState({
    name: '',
    discountPercent: '',
    scope: 'all',
    categoryValue: 'haisan',
    startDate: '',
    endDate: '',
    active: true,
  });

  const toDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const openAddFlashSaleForm = () => {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    setEditingFlashSale(null);
    setFlashSaleForm({
      name: '',
      discountPercent: '',
      scope: 'all',
      categoryValue: 'haisan',
      startDate: toDatetimeLocal(now.toISOString()),
      endDate: toDatetimeLocal(in3Days.toISOString()),
      active: true,
    });
    setShowFlashSaleModal(true);
  };

  const openEditFlashSaleForm = (s) => {
    setEditingFlashSale(s);
    setFlashSaleForm({
      name: s.name,
      discountPercent: s.discountPercent,
      scope: s.scope,
      categoryValue: s.categoryValue || 'haisan',
      startDate: toDatetimeLocal(s.startDate),
      endDate: toDatetimeLocal(s.endDate),
      active: s.active !== false,
    });
    setShowFlashSaleModal(true);
  };

  const saveFlashSale = async () => {
    if (!flashSaleForm.name.trim() || !flashSaleForm.discountPercent) {
      showToast('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (!flashSaleForm.startDate || !flashSaleForm.endDate) {
      showToast('Vui lòng chọn thời gian bắt đầu/kết thúc');
      return;
    }
    if (new Date(flashSaleForm.endDate) <= new Date(flashSaleForm.startDate)) {
      showToast('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const data = {
      name: flashSaleForm.name,
      discountPercent: Number(flashSaleForm.discountPercent),
      scope: flashSaleForm.scope,
      categoryValue: flashSaleForm.scope === 'category' ? flashSaleForm.categoryValue : null,
      productIds: [],
      startDate: new Date(flashSaleForm.startDate).toISOString(),
      endDate: new Date(flashSaleForm.endDate).toISOString(),
      active: flashSaleForm.active,
    };

    if (editingFlashSale) {
      await updateFlashSaleInFirebase(editingFlashSale.firebaseId, data);
      showToast('Đã cập nhật chương trình giảm giá!');
    } else {
      await addFlashSaleToFirebase(data);
      showToast('Đã tạo chương trình giảm giá!');
    }
    setShowFlashSaleModal(false);
  };

  const removeFlashSale = async (s) => {
    await deleteFlashSaleFromFirebase(s.firebaseId);
    showToast('Đã xoá chương trình giảm giá');
  };

  const [rewardsList, setRewardsList] = useState([]);
  const [userVouchers, setUserVouchers] = useState([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  useEffect(() => {
    if (view === 'rewards' && currentUser) {
      setRewardsLoading(true);
      Promise.all([
        getRewardsFromFirebase(),
        getUserVouchersFromFirebase(currentUser.firebaseId),
      ]).then(([r, v]) => {
        setRewardsList(r);
        setUserVouchers(v);
        setRewardsLoading(false);
      });
    }
  }, [view, currentUser]);

  const handleRedeemReward = async (reward) => {
    if (!currentUser) return;
    const result = await redeemRewardInFirebase(currentUser.firebaseId, reward);
    if (result.success) {
      showToast(`🎉 Đổi thành công! Mã voucher: ${result.code}`);
      setCurrentUser({ ...currentUser, points: result.newPoints });
      const v = await getUserVouchersFromFirebase(currentUser.firebaseId);
      setUserVouchers(v);
    } else {
      showToast(`❌ ${result.message}`);
    }
  };

  // ===== CHAT 2 CHIỀU — LẮNG NGHE REAL-TIME =====

  // (Admin) Danh sách luồng chat của tất cả khách hàng — luôn lắng nghe khi Admin đăng nhập
  // để badge số tin chưa đọc trên tab "Tin nhắn" luôn đúng, kể cả khi chưa mở tab đó.
  const prevChatSnapshotRef = useRef(new Map());
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    const unsubscribe = subscribeToAllChats((liveChats) => {
      const prev = prevChatSnapshotRef.current;
      const newUnread = liveChats.filter((c) => {
        const prevUnread = prev.get(c.firebaseId) || 0;
        return c.lastSender === 'user' && (c.unreadForAdmin || 0) > prevUnread;
      });
      if (prev.size > 0 && newUnread.length > 0) {
        showToast(
          newUnread.length === 1
            ? `📩 Tin nhắn mới từ ${newUnread[0].customerName || 'khách hàng'}!`
            : `📩 Có ${newUnread.length} khách hàng vừa nhắn tin mới!`
        );
      }
      prevChatSnapshotRef.current = new Map(liveChats.map((c) => [c.firebaseId, c.unreadForAdmin || 0]));
      setAdminChats(liveChats);
    });
    return () => unsubscribe && unsubscribe();
  }, [currentUser]);

  // (Admin) Nội dung luồng chat đang được chọn để trả lời
  useEffect(() => {
    if (currentUser?.role !== 'admin' || !activeChatUserId) {
      setActiveChatMessages([]);
      return;
    }
    const unsubscribe = subscribeToChatMessages(activeChatUserId, setActiveChatMessages);
    markChatReadByAdmin(activeChatUserId);
    return () => unsubscribe && unsubscribe();
  }, [currentUser, activeChatUserId]);

  const openAdminChat = (userId) => {
    setActiveChatUserId(userId);
    markChatReadByAdmin(userId);
  };

  const sendAdminChatReply = async () => {
    if (!adminChatInput.trim() || !activeChatUserId) return;
    const chat = adminChats.find((c) => c.firebaseId === activeChatUserId);
    await sendChatMessage(
      activeChatUserId,
      { name: chat?.customerName || 'Khách hàng', email: chat?.customerEmail || '' },
      'admin',
      adminChatInput.trim()
    );
    setAdminChatInput('');
  };

  // (Admin) Xóa 1 tin nhắn trong hội thoại đang mở
  const handleDeleteAdminMessage = async (messageId) => {
    if (!activeChatUserId) return;
    if (!window.confirm('Xóa tin nhắn này?')) return;
    const ok = await deleteChatMessage(activeChatUserId, messageId);
    if (!ok) showToast('Có lỗi xảy ra, vui lòng thử lại');
  };

  // (Admin) Xóa toàn bộ hội thoại của 1 khách hàng (xóa khách khỏi danh sách "Tin nhắn")
  const handleDeleteConversation = async (userId, customerName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Xóa toàn bộ hội thoại với ${customerName || 'khách hàng này'}?`)) return;
    const ok = await deleteChatConversation(userId);
    if (!ok) {
      showToast('Có lỗi xảy ra, vui lòng thử lại');
      return;
    }
    if (activeChatUserId === userId) setActiveChatUserId(null);
    showToast('Đã xóa hội thoại');
  };

  // (Khách hàng) Badge "tin mới" trên nút Chat với Admin — lắng nghe luồng chat của chính mình
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      setMyChatMeta(null);
      return;
    }
    const unsubscribe = subscribeToUserChat(currentUser.firebaseId, setMyChatMeta);
    return () => unsubscribe && unsubscribe();
  }, [currentUser]);

  // (Khách hàng) Nội dung luồng chat khi mở khung chat + đánh dấu đã đọc
  useEffect(() => {
    if (!showContact || !currentUser || currentUser.role === 'admin') return;
    const unsubscribe = subscribeToChatMessages(currentUser.firebaseId, setChatMessages);
    markChatReadByUser(currentUser.firebaseId);
    return () => unsubscribe && unsubscribe();
  }, [showContact, currentUser]);

  const sendMyChatMessage = async () => {
    if (!chatInput.trim()) return;
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để chat với Admin');
      setShowLogin(true);
      return;
    }
    await sendChatMessage(
      currentUser.firebaseId,
      { name: currentUser.name, email: currentUser.email },
      'user',
      chatInput.trim()
    );
    setChatInput('');
  };

  // (Khách hàng) Xóa 1 tin nhắn của chính mình trong hội thoại với Admin
  const handleDeleteMyMessage = async (messageId) => {
    if (!currentUser) return;
    if (!window.confirm('Xóa tin nhắn này?')) return;
    const ok = await deleteChatMessage(currentUser.firebaseId, messageId);
    if (!ok) showToast('Có lỗi xảy ra, vui lòng thử lại');
  };

  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    cat: 'haisan',
    region: 'Mũi Né',
    price: '',
    unit: '',
    origin: '',
    desc: '',
    stock: true,
    image: '',
  });

  // ===== KHỞI TẠO TÀI KHOẢN MẪU TRÊN FIREBASE (chạy 1 lần) =====
  useEffect(() => {
    ensureSeedUsers([
      {
        name: USER_DATA.admin.name,
        email: USER_DATA.admin.email,
        password: USER_DATA.admin.password,
        role: 'admin',
        avatar: USER_DATA.admin.avatar,
        favorites: [],
        points: 0,
        lifetimePoints: 0,
        tier: 'Thành viên',
      },
      {
        name: USER_DATA.user.name,
        email: USER_DATA.user.email,
        password: USER_DATA.user.password,
        role: 'user',
        avatar: USER_DATA.user.avatar,
        favorites: [],
        points: 0,
        lifetimePoints: 0,
        tier: 'Thành viên',
      },
    ]);
  }, []);

  // ===== TẢI SẢN PHẨM TỪ FIREBASE (mỗi sản phẩm 1 document riêng trong collection 'products') =====
  useEffect(() => {
    const loadProducts = async () => {
      // Lần chạy đầu tiên: nếu collection trống thì khởi tạo dữ liệu mẫu
      await seedProductsIfEmpty(INITIAL_PRODUCTS);
      const fromFirebase = await getAllProductsFromFirebase();
      setProducts(fromFirebase.length > 0 ? fromFirebase : INITIAL_PRODUCTS);
      setProductsLoaded(true);
    };
    loadProducts();
  }, []);

  // ===== TẢI DANH MỤC TỪ FIREBASE (cho phép admin tạo mới / đổi tên danh mục) =====
  const [categories, setCategories] = useState(DEFAULT_CATS);
  useEffect(() => {
    const loadCategories = async () => {
      await seedCategoriesIfEmpty(DEFAULT_CATS);
      const fromFirebase = await getAllCategoriesFromFirebase();
      const list = fromFirebase.length > 0 ? fromFirebase : DEFAULT_CATS;
      setCategories(list);
      RUNTIME_CATS = list; // cập nhật bảng tra cứu icon/màu dùng ở iconFor/catColor
    };
    loadCategories();
  }, []);

  // Lưu ý: KHÔNG còn lưu lại toàn bộ mảng products mỗi khi thay đổi nữa.
  // Mỗi thao tác thêm/sửa/xoá sản phẩm giờ gọi thẳng addProductToFirebase /
  // updateProductInFirebase / deleteProductInFirebase — tránh vượt giới hạn
  // 1MB/document của Firestore khi có nhiều ảnh base64.

  // ===== FLASH SALE / MÃ GIẢM GIÁ THEO THỜI GIAN =====
  const [flashSales, setFlashSales] = useState([]);
  useEffect(() => {
    const unsubscribe = subscribeToFlashSales((liveSales) => {
      setFlashSales(liveSales);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const [bannerImage, setBannerImage] = useState('');
  const [bannerLoaded, setBannerLoaded] = useState(false);

  // ===== TẢI BANNER TỪ FIREBASE (thay localStorage) =====
  useEffect(() => {
    const loadBanner = async () => {
      const fromFirebase = await getBannerFromFirebase();
      setBannerImage(fromFirebase || '');
      setBannerLoaded(true);
    };
    loadBanner();
  }, []);

  useEffect(() => {
    if (!bannerLoaded) return;
    saveBannerToFirebase(bannerImage);
  }, [bannerImage, bannerLoaded]);

  const [syncingProducts, setSyncingProducts] = useState(false);
  const handleSyncSampleProducts = async () => {
    if (syncingProducts) return;
    setSyncingProducts(true);
    try {
      const result = await syncSampleProductsWithCode(INITIAL_PRODUCTS);
      if (result) {
        const fromFirebase = await getAllProductsFromFirebase();
        setProducts(fromFirebase.length > 0 ? fromFirebase : INITIAL_PRODUCTS);
        if (result.added > 0) {
          showToast(`✅ Đã thêm mới ${result.added} sản phẩm còn thiếu`);
        } else {
          showToast('✅ Danh mục đã đầy đủ, không có sản phẩm mới cần thêm');
        }
      } else {
        showToast('❌ Đồng bộ thất bại, vui lòng thử lại');
      }
    } finally {
      setSyncingProducts(false);
    }
  };

  // ===== QUẢN LÝ DANH MỤC (thêm mới / đổi tên / xoá) =====
  const [savingCategory, setSavingCategory] = useState(false);
  const [newCatForm, setNewCatForm] = useState({
    name: '',
    icon: 'Package',
    color: CAT_COLOR_OPTIONS[0],
    region: '',
  });
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatForm, setEditCatForm] = useState({ name: '', icon: '', color: '', region: '' });

  const slugify = (text) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'danh-muc';

  const refreshCategories = async () => {
    const list = await getAllCategoriesFromFirebase();
    setCategories(list.length > 0 ? list : DEFAULT_CATS);
    RUNTIME_CATS = list.length > 0 ? list : DEFAULT_CATS;
  };

  const handleAddCategory = async () => {
    const name = newCatForm.name.trim();
    if (!name) {
      showToast('❌ Vui lòng nhập tên danh mục');
      return;
    }
    let id = slugify(name);
    // Đảm bảo id không trùng với danh mục đã có
    let suffix = 2;
    const existingIds = new Set(categories.map((c) => c.id));
    let uniqueId = id;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${id}-${suffix}`;
      suffix++;
    }
    setSavingCategory(true);
    try {
      const ok = await addCategoryToFirebase({
        id: uniqueId,
        name,
        icon: newCatForm.icon,
        color: newCatForm.color,
        region: newCatForm.region.trim(),
      });
      if (ok) {
        await refreshCategories();
        setNewCatForm({ name: '', icon: 'Package', color: CAT_COLOR_OPTIONS[0], region: '' });
        showToast(`✅ Đã tạo danh mục "${name}"`);
      } else {
        showToast('❌ Tạo danh mục thất bại, vui lòng thử lại');
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const startEditCategory = (c) => {
    setEditingCatId(c.id);
    setEditCatForm({ name: c.name, icon: c.icon, color: c.color || CAT_COLOR_OPTIONS[0], region: c.region || '' });
  };

  const cancelEditCategory = () => {
    setEditingCatId(null);
  };

  const handleSaveCategory = async (id) => {
    const name = editCatForm.name.trim();
    if (!name) {
      showToast('❌ Tên danh mục không được để trống');
      return;
    }
    setSavingCategory(true);
    try {
      const ok = await updateCategoryInFirebase(id, {
        name,
        icon: editCatForm.icon,
        color: editCatForm.color,
        region: editCatForm.region.trim(),
      });
      if (ok) {
        await refreshCategories();
        setEditingCatId(null);
        showToast('✅ Đã cập nhật danh mục');
      } else {
        showToast('❌ Cập nhật thất bại, vui lòng thử lại');
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (c) => {
    const inUse = products.some((p) => p.cat === c.id);
    if (inUse) {
      showToast('❌ Không thể xoá: vẫn còn sản phẩm đang dùng danh mục này');
      return;
    }
    if (!window.confirm(`Xoá danh mục "${c.name}"?`)) return;
    setSavingCategory(true);
    try {
      const ok = await deleteCategoryInFirebase(c.id);
      if (ok) {
        await refreshCategories();
        showToast('✅ Đã xoá danh mục');
      } else {
        showToast('❌ Xoá thất bại, vui lòng thử lại');
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('❌ Vui lòng chọn một tệp hình ảnh');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('❌ Ảnh quá lớn, vui lòng chọn ảnh dưới 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBannerImage(ev.target.result);
      showToast('Đã cập nhật ảnh banner!');
    };
    reader.readAsDataURL(file);
  };

  // ===== NHỚ ĐĂNG NHẬP (chỉ lưu 1 ID nhỏ ở localStorage làm "vé nhận diện") =====
  // Toàn bộ dữ liệu thật (tên, điểm, yêu thích...) vẫn lấy từ Firebase mỗi lần tải trang.
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    const restoreSession = async () => {
      const savedId = localStorage.getItem('authUserId');
      if (savedId) {
        const user = await getUserByIdFromFirebase(savedId);
        if (user) {
          const withCode = await ensureReferralCode(user);
          setCurrentUser({ ...withCode, id: withCode.firebaseId });
          setFavs(new Set(withCode.favorites || []));
        } else {
          localStorage.removeItem('authUserId');
        }
      }
      setAuthChecked(true);
    };
    restoreSession();
  }, []);

  // ===== LẮNG NGHE ĐƠN HÀNG REAL-TIME TỪ FIREBASE =====
  const prevOrderStatusRef = useRef({});
  const isPlacingOrderRef = useRef(false);
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    const isAdminUser = currentUser.role === 'admin';
    const unsubscribe = isAdminUser
      ? subscribeToAllOrders((liveOrders) => {
          setOrders(liveOrders);
        })
      : subscribeToUserOrders(currentUser.id, (liveOrders) => {
          // 🔔 Thông báo ngay khi trạng thái đơn hàng thay đổi (real-time)
          liveOrders.forEach((o) => {
            const prevStatus = prevOrderStatusRef.current[o.firebaseId];
            if (prevStatus && prevStatus !== o.status) {
              showToast(`📦 Đơn #${o.id} đã chuyển sang "${o.status}"`);
            }
          });
          const statusMap = {};
          liveOrders.forEach((o) => {
            statusMap[o.firebaseId] = o.status;
          });
          prevOrderStatusRef.current = statusMap;
          setOrders(liveOrders);
        });

    return () => unsubscribe && unsubscribe();
  }, [currentUser]); // Chạy lại khi currentUser thay đổi

  // ===== LẮNG NGHE HỒ SƠ NGƯỜI DÙNG REAL-TIME (điểm, hạng, yêu thích) =====
  useEffect(() => {
    if (!currentUser?.firebaseId) return;
    const unsubscribe = subscribeToUserDoc(currentUser.firebaseId, (profile) => {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              points: profile.points,
              lifetimePoints: profile.lifetimePoints,
              tier: profile.tier,
              favorites: profile.favorites,
            }
          : prev
      );
      setFavs(new Set(profile.favorites || []));
    });
    return () => unsubscribe && unsubscribe();
  }, [currentUser?.firebaseId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const addProduct = async () => {
    if (!productForm.name.trim() || !productForm.price) {
      showToast('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const newProduct = {
      id: Math.max(...products.map((p) => p.id)) + 1,
      name: productForm.name,
      cat: productForm.cat,
      region: productForm.region,
      price: parseInt(productForm.price),
      unit: productForm.unit || '1',
      rating: 4.0,
      reviews: 0,
      origin: productForm.origin || productForm.region,
      desc: productForm.desc || 'Sản phẩm đặc sản vùng miền',
      story: productForm.story || '',
      stock: productForm.stock,
      image: productForm.image || '',
    };

    const firebaseId = await addProductToFirebase(newProduct);
    if (!firebaseId) {
      showToast('❌ Thêm sản phẩm thất bại, vui lòng thử lại!');
      return;
    }

    setProducts([...products, { ...newProduct, firebaseId }]);
    setShowProductModal(false);
    setProductForm({
      name: '',
      cat: 'haisan',
      region: 'Mũi Né',
      price: '',
      unit: '',
      origin: '',
      desc: '',
      story: '',
      stock: true,
      image: '',
    });
    showToast('Đã thêm sản phẩm thành công!');
  };

  const updateProduct = async () => {
    if (!productForm.name.trim() || !productForm.price) {
      showToast('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const updatedFields = {
      name: productForm.name,
      cat: productForm.cat,
      region: productForm.region,
      price: parseInt(productForm.price),
      unit: productForm.unit || editingProduct.unit,
      origin: productForm.origin || editingProduct.origin,
      desc: productForm.desc || editingProduct.desc,
      story: productForm.story !== undefined ? productForm.story : editingProduct.story || '',
      stock: productForm.stock,
      image: productForm.image || editingProduct.image,
    };

    if (editingProduct.firebaseId) {
      const ok = await updateProductInFirebase(editingProduct.firebaseId, updatedFields);
      if (!ok) {
        showToast('❌ Cập nhật sản phẩm thất bại, vui lòng thử lại!');
        return;
      }
    }

    setProducts(
      products.map((p) => (p.id === editingProduct.id ? { ...p, ...updatedFields } : p))
    );
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      cat: 'haisan',
      region: 'Mũi Né',
      price: '',
      unit: '',
      origin: '',
      desc: '',
      story: '',
      stock: true,
      image: '',
    });
    showToast('Đã cập nhật sản phẩm!');
  };

  const deleteProduct = async (id) => {
    // Kiểm tra sản phẩm có trong giỏ hàng không
    const inCart = cart.some((item) => item.id === id);
    if (inCart) {
      showToast('❌ Không thể xóa sản phẩm đang có trong giỏ hàng của khách!');
      return;
    }

    // Kiểm tra sản phẩm có đang được sử dụng trong giỏ hàng không
    const isProductInUse = (id) => {
      return cart.some((item) => item.id === id);
    };

    // Lấy danh sách khách hàng đang có sản phẩm trong giỏ (nếu có nhiều user)
    const getUsersWithProductInCart = (id) => {
      // Nếu bạn lưu giỏ hàng cho từng user thì kiểm tra ở đây
      // Hiện tại chỉ có 1 giỏ hàng chung
      return cart.some((item) => item.id === id) ? ['Khách hàng hiện tại'] : [];
    };

    // Kiểm tra sản phẩm có trong danh sách yêu thích không (tùy chọn)
    const inFav = favs.has(id);
    if (inFav) {
      // Có thể cảnh báo nhưng vẫn cho phép xóa
      if (!window.confirm('Sản phẩm này đang được khách hàng yêu thích. Bạn có chắc muốn xóa?')) {
        return;
      }
    }

    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      const product = products.find((p) => p.id === id);
      if (product?.firebaseId) {
        await deleteProductInFirebase(product.firebaseId);
      }
      setProducts(products.filter((p) => p.id !== id));
      // Xóa khỏi danh sách yêu thích nếu có
      if (inFav) {
        const newFavs = new Set(favs);
        newFavs.delete(id);
        setFavs(newFavs);
      }
      showToast('✅ Đã xóa sản phẩm!');
    }
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      cat: product.cat,
      region: product.region,
      price: product.price.toString(),
      unit: product.unit,
      origin: product.origin || '',
      desc: product.desc || '',
      story: product.story || '',
      stock: product.stock !== undefined ? product.stock : true,
      image: product.image || '',
    });
    setShowProductModal(true);
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      cat: 'haisan',
      region: 'Mũi Né',
      price: '',
      unit: '',
      origin: '',
      desc: '',
      story: '',
      stock: true,
      image: '',
    });
    setShowProductModal(true);
  };

  const handleProductImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('❌ Vui lòng chọn một tệp hình ảnh');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('❌ Ảnh quá lớn, vui lòng chọn ảnh dưới 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProductForm((prev) => ({ ...prev, image: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // 🎁 Nếu đây là đơn hàng "Đã giao" ĐẦU TIÊN của khách, và khách đăng ký bằng mã giới thiệu
  // của ai đó (chưa từng được thưởng) → cộng điểm cho cả người giới thiệu và người được giới thiệu.
  const maybeAwardReferralBonus = async (order) => {
    if (!order.userId) return;
    const deliveredBefore = orders.filter(
      (o) =>
        o.userId === order.userId && o.status === 'Đã giao' && o.firebaseId !== order.firebaseId
    ).length;
    if (deliveredBefore > 0) return; // không phải đơn "Đã giao" đầu tiên

    const buyer = await getUserByIdFromFirebase(order.userId);
    if (buyer && buyer.referredBy && !buyer.referralRewarded) {
      const refResult = await awardReferralBonus(buyer.referredBy, order.userId);
      if (refResult?.success) {
        showToast('🎁 Đã cộng điểm thưởng giới thiệu bạn bè cho cả 2 tài khoản!');
      }
    }
  };

  const updateOrderStatus = async (orderFirebaseId, newStatus) => {
    // ✅ Thêm async
    const order = orders.find((o) => o.firebaseId === orderFirebaseId);
    if (!order) return;

    const shouldAwardPoints = newStatus === 'Đã giao' && order.status !== 'Đã giao';

    setOrders(
      orders.map((o) => (o.firebaseId === orderFirebaseId ? { ...o, status: newStatus } : o))
    );
    showToast(`Đã cập nhật đơn hàng #${order.id}`);
    setShowOrderDetail(false);

    // ✅ CẬP NHẬT LÊN FIREBASE
    if (order.firebaseId) {
      await updateOrderStatusInFirebase(order.firebaseId, newStatus);
    }

    // 🎯 Cộng điểm thưởng cho khách khi đơn được giao thành công
    if (shouldAwardPoints && order.userId) {
      const result = await awardPointsForOrder(order.userId, order.total);
      if (result) {
        showToast(`🎯 Đã cộng ${result.earnedPoints} điểm cho khách hàng!`);
      }
      await maybeAwardReferralBonus(order);
    }
  };

  const addToCart = (id) => {
    if (!currentUser) {
      setShowLogin(true);
      showToast('Vui lòng đăng nhập để mua hàng');
      return;
    }
    setCart((prevCart) => {
      const found = prevCart.find((item) => item.id === id);
      if (found) {
        return prevCart.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prevCart, { id, qty: 1 }];
    });
    showToast('Đã thêm vào giỏ hàng');
  };

  const changeQty = (id, delta) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    showToast('Đã xóa sản phẩm khỏi giỏ');
  };

  const toggleFav = async (id) => {
    if (!currentUser) {
      setShowLogin(true);
      showToast('Vui lòng đăng nhập để lưu yêu thích');
      return;
    }
    const n = new Set(favs);
    n.has(id) ? n.delete(id) : n.add(id);
    setFavs(n);
    await updateUserInFirebase(currentUser.firebaseId, { favorites: Array.from(n) });
  };

  // Với tài khoản được tạo trước khi có tính năng giới thiệu bạn bè, tự động
  // sinh mã giới thiệu cho họ ngay lần đăng nhập/tải trang tiếp theo.
  const ensureReferralCode = async (user) => {
    if (user.referralCode) return user;
    const code = await generateUniqueReferralCode();
    await updateUserInFirebase(user.firebaseId, { referralCode: code });
    return { ...user, referralCode: code };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const foundRaw = await findUserInFirebase(loginEmail, loginPassword);
      if (foundRaw) {
        if (foundRaw.status === 'banned') {
          setLoginError('Tài khoản này đã bị khóa. Vui lòng liên hệ cửa hàng để biết thêm chi tiết.');
          return;
        }
        const found = await ensureReferralCode(foundRaw);
        const user = { ...found, id: found.firebaseId };
        setCurrentUser(user);
        setFavs(new Set(found.favorites || []));
        localStorage.setItem('authUserId', found.firebaseId);
        setShowLogin(false);
        setLoginEmail('');
        setLoginPassword('');
        showToast(user.role === 'admin' ? 'Đăng nhập thành công! Chào mừng Admin' : 'Đăng nhập thành công!');

        // Badge số tin nhắn chưa đọc từ khách hàng được tính real-time qua subscribeToAllChats
        // (hiện ngay trên tab "Tin nhắn" trong Kênh quản trị) nên không cần thông báo riêng ở đây.
        return;
      }

      setLoginError('Email hoặc mật khẩu không đúng!');
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      if (error?.code === 'permission-denied') {
        setLoginError(
          'Đăng nhập thất bại: Firestore đang chặn quyền đọc (permission-denied). Vào Firebase Console → Firestore Database → Rules và cho phép read/write.'
        );
      } else if (error?.code === 'unavailable' || error?.message?.includes('network')) {
        setLoginError('Đăng nhập thất bại: không kết nối được tới máy chủ. Kiểm tra mạng internet.');
      } else {
        setLoginError(`Đăng nhập thất bại: ${error?.code || error?.message || 'lỗi không xác định'}`);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerName.trim()) {
      setRegisterError('Vui lòng nhập họ tên');
      return;
    }
    if (!registerEmail.trim()) {
      setRegisterError('Vui lòng nhập email');
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      const exists = await checkEmailExistsInFirebase(registerEmail);
      if (exists) {
        setRegisterError('Email đã được đăng ký');
        return;
      }

      // 🎁 Nếu khách nhập mã giới thiệu, kiểm tra mã đó có tồn tại không
      const referralCodeInput = registerReferralCode.trim().toUpperCase();
      let referrer = null;
      if (referralCodeInput) {
        referrer = await getUserByReferralCode(referralCodeInput);
        if (!referrer) {
          setRegisterError('Mã giới thiệu không hợp lệ');
          return;
        }
      }

      const ownReferralCode = await generateUniqueReferralCode();

      const newUserData = {
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: 'user',
        avatar: registerName.charAt(0).toUpperCase(),
        favorites: [],
        points: 0,
        lifetimePoints: 0,
        tier: 'Thành viên',
        createdAt: new Date().toISOString(),
        referralCode: ownReferralCode,
        referredBy: referrer ? referrer.firebaseId : null,
        referralRewarded: false,
      };

      const created = await createUserInFirebase(newUserData);
      if (!created) {
        setRegisterError('Đăng ký thất bại, vui lòng thử lại');
        return;
      }

      const user = { ...created, id: created.firebaseId };
      setCurrentUser(user);
      setFavs(new Set());
      localStorage.setItem('authUserId', created.firebaseId);

      setShowLogin(false);
      setIsRegisterMode(false);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterReferralCode('');
      showToast(
        referrer
          ? 'Đăng ký thành công! Hoàn tất đơn hàng đầu tiên để nhận 50 điểm thưởng giới thiệu 🎁'
          : 'Đăng ký thành công! Chào mừng bạn đến với Vị Miền'
      );
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      if (error?.code === 'permission-denied') {
        setRegisterError(
          'Đăng ký thất bại: Firestore đang chặn quyền ghi (permission-denied). Vào Firebase Console → Firestore Database → Rules và cho phép read/write.'
        );
      } else if (error?.code === 'unavailable' || error?.message?.includes('network')) {
        setRegisterError('Đăng ký thất bại: không kết nối được tới máy chủ. Kiểm tra mạng internet.');
      } else {
        setRegisterError(`Đăng ký thất bại: ${error?.code || error?.message || 'lỗi không xác định'}`);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCart([]);
    setFavs(new Set());
    setView('home');
    localStorage.removeItem('authUserId');
    showToast('Đã đăng xuất');
  };

  const cartCount = cart.reduce((a, i) => a + i.qty, 0);
  const cartTotal = cart.reduce((a, i) => {
    const product = products.find((p) => p.id === i.id);
    if (!product) return a;
    const { finalPrice } = getDiscountedPrice(product, flashSales);
    return a + i.qty * finalPrice;
  }, 0);

  const [selectedVoucherId, setSelectedVoucherId] = useState('');
  const selectedVoucher = userVouchers.find(
    (v) => v.firebaseId === selectedVoucherId && v.status === 'Chưa dùng'
  );
  // Voucher "fixed" giảm trực tiếp vào tiền hàng; voucher "freeship" giảm vào phí vận chuyển —
  // chỉ 1 trong 2 loại được áp dụng cho mỗi voucher, không cộng dồn cả hai.
  const voucherDiscount =
    selectedVoucher && selectedVoucher.discountType === 'fixed' ? selectedVoucher.discountValue : 0;

  // ===== PHÍ VẬN CHUYỂN: theo khoảng cách từ vị trí khách đến cửa hàng gần nhất trên bản đồ =====
  const [shippingMethod, setShippingMethod] = useState('standard'); // 'standard' | 'express'
  // Ưu tiên toạ độ suy ra từ địa chỉ giao hàng đã gõ (chính xác hơn nhiều so với GPS máy/trình duyệt);
  // chỉ dùng GPS làm phương án dự phòng khi chưa geocode được địa chỉ.
  const shippingLocation = addressLocation || myLocation;
  const nearestStoreDistanceKm = useMemo(
    () => getNearestStoreDistanceKm(shippingLocation),
    [shippingLocation]
  );
  const shippingFeeStandard = getShippingFee(nearestStoreDistanceKm, 'standard');
  const shippingFeeExpress = getShippingFee(nearestStoreDistanceKm, 'express');
  const shippingFeeBase = shippingMethod === 'express' ? shippingFeeExpress : shippingFeeStandard;

  // Giảm phí ship theo số loại sản phẩm khác nhau trong giỏ (mua càng nhiều loại càng giảm nhiều).
  const distinctProductCount = cart.length;
  const multiProductDiscountPercent = getMultiProductShippingDiscountPercent(distinctProductCount);
  const multiProductShippingDiscount = Math.round(shippingFeeBase * multiProductDiscountPercent);
  const shippingFeeAfterMultiDiscount = shippingFeeBase - multiProductShippingDiscount;

  const shippingDiscount =
    selectedVoucher && selectedVoucher.discountType === 'freeship'
      ? Math.min(shippingFeeAfterMultiDiscount, selectedVoucher.discountValue || shippingFeeAfterMultiDiscount)
      : 0;
  const shippingFee = Math.max(0, shippingFeeAfterMultiDiscount - shippingDiscount);

  const finalTotal = Math.max(0, cartTotal - voucherDiscount) + shippingFee;

  // Tải ví voucher khi bước vào bước xác nhận thanh toán
  useEffect(() => {
    if (view === 'checkout' && checkoutStep === 3 && currentUser) {
      getUserVouchersFromFirebase(currentUser.firebaseId).then(setUserVouchers);
    }
  }, [view, checkoutStep, currentUser]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (catFilter !== 'all') list = list.filter((p) => p.cat === catFilter);
    if (regionFilter !== 'all') list = list.filter((p) => p.region === regionFilter);
    if (sort === 'priceAsc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [query, catFilter, regionFilter, sort, products]);

  // ✅ ĐỢT 7: Gợi ý sản phẩm cá nhân hoá "Có thể bạn thích"
  // Thuật toán: đếm số lần xuất hiện của từng danh mục (cat) & khu vực (region)
  // trong lịch sử đơn hàng (đã mua) + danh sách yêu thích của khách, rồi chấm điểm
  // các sản phẩm CHƯA mua theo mức độ trùng khớp cat/region, ưu tiên rating cao khi hoà điểm.
  // Nếu khách chưa có lịch sử mua/yêu thích nào -> ẩn hẳn mục này (không fallback ra top-rated
  // để tránh trùng lặp với mục "Đang được yêu thích" ở trên).
  const recommendedProducts = useMemo(() => {
    if (!currentUser) return [];

    const myOrders = orders.filter((o) => o.userId === currentUser.id);
    const boughtIds = new Set();
    myOrders.forEach((o) => (o.items || []).forEach((it) => boughtIds.add(it.id)));

    if (boughtIds.size === 0 && favs.size === 0) return [];

    const catScore = {};
    const regionScore = {};
    const tally = (id, weight) => {
      const p = products.find((pp) => pp.id === id);
      if (!p) return;
      catScore[p.cat] = (catScore[p.cat] || 0) + weight;
      regionScore[p.region] = (regionScore[p.region] || 0) + weight;
    };
    boughtIds.forEach((id) => tally(id, 2)); // đã mua: trọng số cao hơn
    favs.forEach((id) => tally(id, 1)); // đã yêu thích: trọng số thấp hơn

    const scored = products
      .filter((p) => !boughtIds.has(p.id) && p.stock !== false)
      .map((p) => {
        const score = (catScore[p.cat] || 0) * 2 + (regionScore[p.region] || 0) * 1;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating);

    return scored.slice(0, 4).map((x) => x.p);
  }, [currentUser, orders, favs, products]);

  // ===== THỐNG KÊ DOANH THU CHO ADMIN (Đợt 9) =====
  // Ghi chú: doanh thu chỉ tính trên các đơn KHÔNG bị hủy (giả định hợp lý vì
  // đơn "Đã hủy" không mang lại doanh thu thật). Dữ liệu lấy trực tiếp từ
  // `orders` (đã có sẵn real-time toàn bộ đơn hàng khi currentUser là admin)
  // và `products` (đang có trong state), không cần thêm collection Firestore mới.
  const statsData = useMemo(() => {
    const getMonday = (d) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const validOrders = orders.filter((o) => o.status !== 'Đã hủy');
    const cancelledOrders = orders.filter((o) => o.status === 'Đã hủy');
    const deliveredOrders = orders.filter((o) => o.status === 'Đã giao');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrderValue = validOrders.length ? Math.round(totalRevenue / validOrders.length) : 0;

    // Tạo các "bucket" thời gian trống trước, dựa theo statsPeriod
    const now = new Date();
    const buckets = [];
    if (statsPeriod === 'day') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        buckets.push({
          key: d.toISOString().slice(0, 10),
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          revenue: 0,
        });
      }
    } else if (statsPeriod === 'week') {
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const monday = getMonday(d);
        buckets.push({
          key: monday.toISOString().slice(0, 10),
          label: `${monday.getDate()}/${monday.getMonth() + 1}`,
          revenue: 0,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`,
          revenue: 0,
        });
      }
    }
    const bucketMap = {};
    buckets.forEach((b) => (bucketMap[b.key] = b));

    validOrders.forEach((o) => {
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return;
      let key;
      if (statsPeriod === 'day') key = d.toISOString().slice(0, 10);
      else if (statsPeriod === 'week') key = getMonday(d).toISOString().slice(0, 10);
      else key = `${d.getFullYear()}-${d.getMonth()}`;
      if (bucketMap[key]) bucketMap[key].revenue += o.total || 0;
    });

    // Sản phẩm bán chạy nhất — gộp theo id sản phẩm trong các đơn hợp lệ
    const prodAgg = {};
    validOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const id = typeof it === 'string' ? it : it.id;
        const qty = typeof it === 'string' ? 1 : it.qty || 1;
        if (id == null) return;
        if (!prodAgg[id]) prodAgg[id] = { id, qty: 0, revenue: 0 };
        prodAgg[id].qty += qty;
        const p = products.find((pp) => pp.id === id);
        prodAgg[id].revenue += (p?.price || 0) * qty;
      });
    });
    const topProducts = Object.values(prodAgg)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((x) => ({ ...x, product: products.find((p) => p.id === x.id) }));

    return {
      totalRevenue,
      totalOrders: orders.length,
      avgOrderValue,
      cancelledCount: cancelledOrders.length,
      deliveredCount: deliveredOrders.length,
      buckets,
      topProducts,
    };
  }, [orders, products, statsPeriod]);

  const openProduct = (id) => {
    setProductId(id);
    setView('detail');
    window.scrollTo?.(0, 0);
  };
  const goSearch = (q) => {
    setQuery(q || '');
    setView('search');
  };

  const placeOrder = async () => {
    // ✅ CHỐNG BẤM/GỬI TRÙNG: nếu đang xử lý 1 đơn rồi thì bỏ qua lần gọi thứ 2
    // (đây là nguyên nhân gây ra đơn hàng bị trùng lặp y hệt nhau khi bấm nhanh 2 lần)
    if (isPlacingOrderRef.current) return;
    isPlacingOrderRef.current = true;
    setIsPlacingOrder(true);

    try {
      // ✅ KIỂM TRA ĐĂNG NHẬP
      if (!currentUser) {
        showToast('Vui lòng đăng nhập để đặt hàng');
        setShowLogin(true);
        return;
      }

      if (cart.length === 0) {
        showToast('Giỏ hàng trống!');
        return;
      }

      // Kiểm tra sản phẩm hợp lệ
      const invalidItems = cart.filter((item) => !products.find((p) => p.id === item.id));
      if (invalidItems.length > 0) {
        showToast(`⚠️ Có ${invalidItems.length} sản phẩm đã bị xóa khỏi hệ thống!`);
        return;
      }

      const newOrder = {
        id: 'DH' + Date.now().toString().slice(-8) + Math.floor(10 + Math.random() * 90),
        date: new Date().toLocaleDateString('vi-VN'),
        status: 'Đang xử lý',
        total: finalTotal,
        subtotal: cartTotal,
        shippingMethod: shippingMethod === 'express' ? 'Hoả tốc' : 'Tiêu chuẩn',
        shippingFee: shippingFee,
        shippingFeeBase: shippingFeeBase,
        shippingDiscount: shippingDiscount,
        voucherCode: selectedVoucher ? selectedVoucher.code : null,
        voucherDiscount: voucherDiscount,
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        payment: payMethod === 'cod' ? 'COD' : payMethod === 'bank' ? 'Chuyển khoản' : 'Thẻ',
        userId: currentUser?.id || null,
        customer: {
          name: currentUser?.name || 'Khách hàng',
          email: currentUser?.email || 'Chưa có email',
          phone: customerPhone || 'Chưa cập nhật',
          address: address || 'Chưa có địa chỉ',
        },
      };

      // ✅ LƯU LÊN FIREBASE
      // Lưu ý: KHÔNG tự setOrders(...) thêm đơn ở đây nữa.
      // Listener real-time (subscribeToUserOrders / subscribeToAllOrders) đã tự
      // động nhận đơn mới từ Firebase và cập nhật state 'orders' rồi.
      // Trước đây vừa setOrders thủ công ở đây, vừa có listener cập nhật,
      // khiến 1 đơn hàng bị thêm vào danh sách 2 lần (trùng firebaseId, trùng
      // key React) => hiển thị 2 đơn cùng lúc, dữ liệu đơn mới bị "dính" đè
      // lên card của đơn cũ.
      const orderId = await saveOrderToFirebase(newOrder);
      if (orderId) {
        showToast('Đặt hàng thành công!');
        if (selectedVoucher) {
          await markVoucherUsedInFirebase(selectedVoucher.firebaseId);
          setSelectedVoucherId('');
        }
      } else {
        showToast('❌ Đặt hàng thất bại, vui lòng kiểm tra kết nối mạng và thử lại!');
        return;
      }

      setCart([]);
      setCheckoutStep(4);
    } finally {
      isPlacingOrderRef.current = false;
      setIsPlacingOrder(false);
    }
  };

  // Hàm này dùng để cập nhật trạng thái đơn hàng kèm lý do
  const updateOrderWithReason = async (orderFirebaseId, newStatus, reason = '') => {
    // ✅ Thêm async
    const order = orders.find((o) => o.firebaseId === orderFirebaseId);
    if (!order) return;

    const shouldAwardPoints = newStatus === 'Đã giao' && order.status !== 'Đã giao';

    const updatedOrder = {
      ...order,
      status: newStatus,
      note: reason || order.note || '',
    };
    setOrders(orders.map((o) => (o.firebaseId === orderFirebaseId ? updatedOrder : o)));
    showToast(
      newStatus === 'Đã hủy' ? `Đã hủy đơn hàng #${order.id}` : `Đã cập nhật đơn hàng #${order.id}`
    );
    setShowOrderDetail(false);

    // ✅ CẬP NHẬT LÊN FIREBASE
    if (order.firebaseId) {
      await updateOrderStatusInFirebase(order.firebaseId, newStatus);
    }

    // 🎯 Cộng điểm thưởng cho khách khi đơn được giao thành công
    if (shouldAwardPoints && order.userId) {
      const result = await awardPointsForOrder(order.userId, order.total);
      if (result) {
        showToast(`🎯 Đã cộng ${result.earnedPoints} điểm cho khách hàng!`);
      }
      await maybeAwardReferralBonus(order);
    }
  };

  // Hàm quay lại checkout từ trang thành công
  const resetCheckout = () => {
    setCheckoutStep(1);
    setView('home');
  };

  const regions = ['Phan Thiết', 'Mũi Né', 'Lâm Đồng'];
  const isAdmin = currentUser?.role === 'admin';

  // Khi mở chi tiết 1 đơn hàng đã giao (của khách, không phải admin), tải sẵn các sản phẩm
  // đã được đánh giá trong đơn đó để ẩn nút "Đánh giá" và hiện trạng thái "Đã đánh giá".
  useEffect(() => {
    if (showOrderDetail && selectedOrder && selectedOrder.status === 'Đã giao' && !isAdmin) {
      getReviewsByOrder(selectedOrder.id).then((list) => {
        setReviewedKeysInOrder(new Set(list.map((r) => `${r.orderId}_${r.productId}`)));
      });
    } else {
      setReviewedKeysInOrder(new Set());
    }
  }, [showOrderDetail, selectedOrder, isAdmin]);

  // Lắng nghe real-time các đánh giá thật của sản phẩm đang xem ở trang chi tiết
  useEffect(() => {
    if (view !== 'detail' || !productId) {
      setProductReviews([]);
      return;
    }
    const unsubscribe = subscribeToProductReviews(productId, setProductReviews);
    return () => unsubscribe && unsubscribe();
  }, [view, productId]);

  // ⚠️ Trước đây completeOrder() tự tạo đơn hàng cục bộ và KHÔNG lưu lên Firebase,
  // khiến đơn "chuyển khoản" chỉ tồn tại tạm trên máy rồi biến mất/đè lên đơn khác
  // khi dữ liệu thật từ Firebase được đồng bộ lại (onSnapshot). Giờ dùng chung
  // hàm placeOrder() để đảm bảo mọi đơn hàng đều được lưu đúng và tính đúng tiền
  // (bao gồm cả giảm giá flash sale + voucher).
  const completeOrder = () => {
    setShowBankTransfer(false);
    placeOrder();
  };

  return (
    <div
      style={{
        fontFamily: "'Be Vietnam Pro',sans-serif",
        background: C.paper,
        color: C.ink,
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        position: 'relative',
        boxShadow: '0 0 40px rgba(0,0,0,.08)',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
        input, select, textarea { font-family: inherit; }
        ::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(4px);} to {opacity:1; transform:none;} }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal-content {
          background: #fff;
          border-radius: 20px;
          max-width: 400px;
          width: 100%;
          padding: 24px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
      `}</style>

      {/* MÀN HÌNH MẤT KẾT NỐI MẠNG — phủ toàn màn hình, tự ẩn khi có mạng lại */}
      {!isOnline && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: C.paper,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: C.sand,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <WifiOff size={36} color={C.brick} />
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
            Mất kết nối mạng
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.6, marginBottom: 24, maxWidth: 300 }}>
            Ứng dụng cần kết nối internet để hoạt động. Vui lòng kiểm tra Wi-Fi hoặc dữ liệu di
            động rồi thử lại.
          </div>
          <button
            onClick={() => setIsOnline(navigator.onLine)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: C.brick,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '11px 22px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Thử lại
          </button>
        </div>
      )}

      {/* MÀN HÌNH XIN QUYỀN VỊ TRÍ + BỘ NHỚ — chỉ hiện 1 lần lúc mở app Android lần đầu */}
      {showPermissionScreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: C.paper,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: C.sand,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={36} color={C.pine} />
          </div>
          <div
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.ink,
              marginBottom: 8,
            }}
          >
            Cho phép quyền truy cập
          </div>
          <div
            style={{
              fontSize: 13.5,
              color: C.inkSoft,
              lineHeight: 1.6,
              marginBottom: 20,
              maxWidth: 320,
            }}
          >
            Để Đặc Sản App hoạt động tốt nhất, ứng dụng cần một vài quyền sau:
          </div>

          <div style={{ width: '100%', maxWidth: 320, marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: '#fff',
                border: '1px solid #EAE1CC',
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                textAlign: 'left',
              }}
            >
              <MapPin size={20} color={C.brick} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Vị trí</div>
                <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
                  Gợi ý địa chỉ giao hàng và cửa hàng gần bạn chính xác hơn.
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: '#fff',
                border: '1px solid #EAE1CC',
                borderRadius: 12,
                padding: 14,
                textAlign: 'left',
              }}
            >
              <Image size={20} color={C.brick} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Bộ nhớ / Ảnh</div>
                <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
                  Chọn ảnh đại diện, ảnh sản phẩm để đăng hoặc cập nhật hồ sơ.
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGrantPermissions}
            disabled={isRequestingPermissions}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              maxWidth: 320,
              background: C.brick,
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '13px 22px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: isRequestingPermissions ? 'default' : 'pointer',
              opacity: isRequestingPermissions ? 0.7 : 1,
              marginBottom: 10,
            }}
          >
            <ShieldCheck size={16} />
            {isRequestingPermissions ? 'Đang xin quyền...' : 'Cho phép'}
          </button>
          <button
            onClick={handleSkipPermissions}
            disabled={isRequestingPermissions}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.inkSoft,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px 12px',
            }}
          >
            Để sau
          </button>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: C.paper }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
          }}
        >
          <div
            onClick={() => setView('home')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: C.night,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Fish size={16} color={C.dawn} />
            </div>
            <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: 17 }}>
              Vị Miền
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {currentUser && isAdmin && (
              <button onClick={() => setView('admin')} style={iconBtn} title="Quản trị">
                <Shield size={16} color={C.brick} />
              </button>
            )}
            <button
              onClick={() => (currentUser ? setView('account') : setShowLogin(true))}
              style={iconBtn}
            >
              {currentUser ? (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: C.night,
                    color: C.paper,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {currentUser.avatar}
                </div>
              ) : (
                <User size={18} />
              )}
            </button>
            <button
              onClick={() => (currentUser ? setView('cart') : setShowLogin(true))}
              style={{ ...iconBtn, position: 'relative' }}
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: C.brick,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {view !== 'detail' && view !== 'checkout' && view !== 'admin' && view !== 'cart' && (
          <div style={{ padding: '0 16px 12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fff',
                border: '1px solid #EAE1CC',
                borderRadius: 12,
                padding: '9px 12px',
              }}
            >
              <Search size={16} color={C.inkSoft} />
              <input
                placeholder="Tìm mực một nắng, nước mắm, cà phê..."
                value={query}
                onChange={(e) => goSearch(e.target.value)}
                onFocus={() => setView('search')}
                style={{
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  fontSize: 13.5,
                  background: 'transparent',
                }}
              />
              {query && (
                <X
                  size={14}
                  color={C.inkSoft}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setQuery('')}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* LOGIN/REGISTER MODAL */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => {
                setShowLogin(false);
                setLoginError('');
                setRegisterError('');
                setIsRegisterMode(false);
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            {!isRegisterMode ? (
              <div>
                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 22,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Đăng nhập
                </h2>
                <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
                  Đăng nhập để mua hàng và theo dõi đơn
                </p>

                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Email
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: `1px solid ${loginError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '0 10px',
                      }}
                    >
                      <Mail size={16} color={C.inkSoft} />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setLoginError('');
                        }}
                        placeholder="example@email.com"
                        style={{
                          border: 'none',
                          outline: 'none',
                          flex: 1,
                          padding: '10px 8px',
                          fontSize: 13,
                          background: 'transparent',
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Mật khẩu
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: `1px solid ${loginError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '0 10px',
                      }}
                    >
                      <Lock size={16} color={C.inkSoft} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginError('');
                        }}
                        placeholder="••••••••"
                        style={{
                          border: 'none',
                          outline: 'none',
                          flex: 1,
                          padding: '10px 8px',
                          fontSize: 13,
                          background: 'transparent',
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {showPassword ? (
                          <EyeOff size={16} color={C.inkSoft} />
                        ) : (
                          <Eye size={16} color={C.inkSoft} />
                        )}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: C.brick,
                        marginBottom: 12,
                        padding: 8,
                        background: '#fde8e8',
                        borderRadius: 8,
                      }}
                    >
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      background: C.night,
                      color: C.paper,
                      border: 'none',
                      borderRadius: 12,
                      padding: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Đăng nhập
                  </button>
                </form>

                <div
                  style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, color: C.inkSoft }}
                >
                  Chưa có tài khoản?{' '}
                  <button
                    onClick={() => {
                      setIsRegisterMode(true);
                      setLoginError('');
                      setRegisterError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.night,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Đăng ký ngay
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 11,
                    color: C.inkSoft,
                    textAlign: 'center',
                    borderTop: '1px solid #EAE1CC',
                    paddingTop: 12,
                  }}
                >
                  <div>Tài khoản demo:</div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      justifyContent: 'center',
                      marginTop: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      <b>Admin:</b> admin@vimieng.com / admin123
                    </span>
                    <span>
                      <b>User:</b> thao.nguyen@email.com / user123
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 22,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Đăng ký
                </h2>
                <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
                  Tạo tài khoản để mua sắm dễ dàng
                </p>

                <form onSubmit={handleRegister}>
                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Họ tên
                    </label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => {
                        setRegisterName(e.target.value);
                        setRegisterError('');
                      }}
                      placeholder="Nguyễn Văn A"
                      style={{
                        width: '100%',
                        border: `1px solid ${registerError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => {
                        setRegisterEmail(e.target.value);
                        setRegisterError('');
                      }}
                      placeholder="example@email.com"
                      style={{
                        width: '100%',
                        border: `1px solid ${registerError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Mật khẩu (tối thiểu 6 ký tự)
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setRegisterError('');
                      }}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        border: `1px solid ${registerError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Xác nhận mật khẩu
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerConfirmPassword}
                      onChange={(e) => {
                        setRegisterConfirmPassword(e.target.value);
                        setRegisterError('');
                      }}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        border: `1px solid ${registerError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Mã giới thiệu (nếu có)
                    </label>
                    <input
                      type="text"
                      value={registerReferralCode}
                      onChange={(e) => {
                        setRegisterReferralCode(e.target.value.toUpperCase());
                        setRegisterError('');
                      }}
                      placeholder="Ví dụ: REF4K9XZ"
                      style={{
                        width: '100%',
                        border: `1px solid ${registerError ? C.brick : '#EAE1CC'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                        textTransform: 'uppercase',
                      }}
                    />
                  </div>

                  {registerError && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: C.brick,
                        marginBottom: 12,
                        padding: 8,
                        background: '#fde8e8',
                        borderRadius: 8,
                      }}
                    >
                      {registerError}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      background: C.night,
                      color: C.paper,
                      border: 'none',
                      borderRadius: 12,
                      padding: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer',
                    }}
                  >
                    Đăng ký
                  </button>
                </form>

                <div
                  style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, color: C.inkSoft }}
                >
                  Đã có tài khoản?{' '}
                  <button
                    onClick={() => {
                      setIsRegisterMode(false);
                      setRegisterError('');
                      setLoginError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.night,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Đăng nhập
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => {
                setShowProductModal(false);
                setEditingProduct(null);
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <h2
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Hình ảnh sản phẩm
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#f5f5f5',
                    border: '1px solid #EAE1CC',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {productForm.image ? (
                    <img
                      src={productForm.image}
                      alt="Xem trước"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 10, color: '#B8AE96', textAlign: 'center', padding: 4 }}>
                      Chưa có ảnh
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <label
                    style={{
                      border: '1px solid #EAE1CC',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: '#fff',
                    }}
                  >
                    {productForm.image ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {productForm.image && (
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, image: '' })}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#B33A3A',
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'center',
                      }}
                    >
                      Xoá ảnh
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Tên sản phẩm *
              </label>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Nhập tên sản phẩm"
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Danh mục
              </label>
              <select
                value={productForm.cat}
                onChange={(e) => setProductForm({ ...productForm, cat: e.target.value })}
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Khu vực
              </label>
              <select
                value={productForm.region}
                onChange={(e) => setProductForm({ ...productForm, region: e.target.value })}
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                >
                  Giá *
                </label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0"
                  style={{
                    width: '100%',
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                >
                  Đơn vị
                </label>
                <input
                  type="text"
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  placeholder="500g"
                  style={{
                    width: '100%',
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Nguồn gốc
              </label>
              <input
                type="text"
                value={productForm.origin}
                onChange={(e) => setProductForm({ ...productForm, origin: e.target.value })}
                placeholder="Ví dụ: Làng chài Mũi Né"
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Mô tả
              </label>
              <textarea
                value={productForm.desc}
                onChange={(e) => setProductForm({ ...productForm, desc: e.target.value })}
                rows={3}
                placeholder="Mô tả sản phẩm..."
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Câu chuyện sản phẩm{' '}
                <span style={{ fontWeight: 400, color: C.inkSoft }}>(hiển thị ở trang chi tiết)</span>
              </label>
              <textarea
                value={productForm.story || ''}
                onChange={(e) => setProductForm({ ...productForm, story: e.target.value })}
                rows={4}
                placeholder="Kể câu chuyện về nguồn gốc, người làm ra sản phẩm, cách chế biến truyền thống..."
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.checked })}
                  style={{ width: 16, height: 16 }}
                />
                Còn hàng
              </label>
            </div>

            <button
              onClick={editingProduct ? updateProduct : addProduct}
              style={{
                width: '100%',
                background: C.night,
                color: C.paper,
                border: 'none',
                borderRadius: 12,
                padding: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {editingProduct ? 'Cập nhật' : 'Thêm sản phẩm'}
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL THÊM/SỬA QUÀ TẶNG (ADMIN) ===== */}
      {showRewardModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => setShowRewardModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <h2
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {editingReward ? 'Sửa quà / voucher' : 'Thêm quà / voucher mới'}
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Tên quà / voucher *
              </label>
              <input
                type="text"
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="VD: Voucher giảm 20.000đ"
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Số điểm cần đổi *
              </label>
              <input
                type="number"
                value={rewardForm.pointsCost}
                onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })}
                placeholder="VD: 200"
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Loại ưu đãi
              </label>
              <select
                value={rewardForm.discountType}
                onChange={(e) => setRewardForm({ ...rewardForm, discountType: e.target.value })}
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  background: '#fff',
                }}
              >
                <option value="fixed">Giảm giá số tiền cố định</option>
                <option value="freeship">Miễn phí vận chuyển</option>
                <option value="gift">Quà tặng đặc sản</option>
              </select>
            </div>

            {rewardForm.discountType === 'fixed' && (
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                >
                  Số tiền giảm (đ) *
                </label>
                <input
                  type="number"
                  value={rewardForm.discountValue}
                  onChange={(e) => setRewardForm({ ...rewardForm, discountValue: e.target.value })}
                  placeholder="VD: 20000"
                  style={{
                    width: '100%',
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <button
              onClick={saveReward}
              style={{
                width: '100%',
                background: C.night,
                color: C.paper,
                border: 'none',
                borderRadius: 12,
                padding: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {editingReward ? 'Cập nhật' : 'Thêm quà'}
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL THÊM/SỬA FLASH SALE (ADMIN) ===== */}
      {showFlashSaleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => setShowFlashSaleModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <h2
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              {editingFlashSale ? 'Sửa chương trình giảm giá' : 'Tạo chương trình giảm giá'}
            </h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Tên chương trình *
              </label>
              <input
                type="text"
                value={flashSaleForm.name}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, name: e.target.value })}
                placeholder="VD: Flash Sale hải sản khô cuối tuần"
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Phần trăm giảm giá (%) *
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={flashSaleForm.discountPercent}
                onChange={(e) =>
                  setFlashSaleForm({ ...flashSaleForm, discountPercent: e.target.value })
                }
                placeholder="VD: 20"
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Áp dụng cho
              </label>
              <select
                value={flashSaleForm.scope}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, scope: e.target.value })}
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                  background: '#fff',
                }}
              >
                <option value="all">Toàn bộ sản phẩm</option>
                <option value="category">Theo danh mục</option>
              </select>
            </div>

            {flashSaleForm.scope === 'category' && (
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                >
                  Danh mục
                </label>
                <select
                  value={flashSaleForm.categoryValue}
                  onChange={(e) =>
                    setFlashSaleForm({ ...flashSaleForm, categoryValue: e.target.value })
                  }
                  style={{
                    width: '100%',
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                    background: '#fff',
                  }}
                >
                  <option value="haisan">Hải sản khô</option>
                  <option value="nuocmam">Nước mắm</option>
                  <option value="cafe">Cà phê</option>
                  <option value="tra">Trà</option>
                  <option value="ruouvang">Rượu vang</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                >
                  Bắt đầu *
                </label>
                <input
                  type="datetime-local"
                  value={flashSaleForm.startDate}
                  onChange={(e) =>
                    setFlashSaleForm({ ...flashSaleForm, startDate: e.target.value })
                  }
                  style={{
                    width: '100%',
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 8px',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                >
                  Kết thúc *
                </label>
                <input
                  type="datetime-local"
                  value={flashSaleForm.endDate}
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, endDate: e.target.value })}
                  style={{
                    width: '100%',
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 8px',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                fontWeight: 600,
                marginBottom: 16,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={flashSaleForm.active}
                onChange={(e) => setFlashSaleForm({ ...flashSaleForm, active: e.target.checked })}
              />
              Kích hoạt chương trình
            </label>

            <button
              onClick={saveFlashSale}
              style={{
                width: '100%',
                background: C.night,
                color: C.paper,
                border: 'none',
                borderRadius: 12,
                padding: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {editingFlashSale ? 'Cập nhật' : 'Tạo chương trình'}
            </button>
          </div>
        </div>
      )}

      {/* HOME */}
      {view === 'home' && (
        <div className="fade-in">
          <div
            style={{
              margin: '0 16px 0',
              borderRadius: 18,
              overflow: 'hidden',
              position: 'relative',
              background: bannerImage
                ? `linear-gradient(160deg, ${C.night}CC 0%, ${C.nightSoft}B3 45%, ${C.pine}CC 100%), url(${bannerImage}) center/cover no-repeat`
                : `linear-gradient(160deg, ${C.night} 0%, ${C.nightSoft} 45%, ${C.pine} 100%)`,
              padding: '26px 20px 30px',
              color: C.paper,
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -20,
                top: -20,
                width: 130,
                height: 130,
                borderRadius: '50%',
                background: `${C.dawn}33`,
              }}
            />
            <span
              style={{
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: C.dawn,
                fontWeight: 700,
              }}
            >
              Từ biển Mũi Né đến đồi Lâm Đồng
            </span>
            <h1
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.2,
                margin: '8px 0 10px',
                maxWidth: 260,
              }}
            >
              Đặc sản thật, kể chuyện vùng đất thật
            </h1>
            <p style={{ fontSize: 13, opacity: 0.85, maxWidth: 260, marginBottom: 16 }}>
              Hải sản khô, nước mắm truyền thống, cà phê & trà cao nguyên — chọn lọc từ người làm ra
              chúng.
            </p>
            <button
              onClick={() => goSearch('')}
              style={{
                background: C.paper,
                color: C.night,
                border: 'none',
                padding: '10px 16px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Khám phá sản phẩm
            </button>
          </div>

          <WaveDivider />

          <div style={{ padding: '4px 16px 6px' }}>
            <SectionTitle title="Danh mục" sub="Chọn theo nhóm hàng" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(categories.length, 6)}, 1fr)`,
                gap: 4,
              }}
            >
              {categories.map((c) => {
                const Icon = CAT_ICON_MAP[c.icon] || Package;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCatFilter(c.id);
                      goSearch('');
                    }}
                    style={{ cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 64,
                        aspectRatio: '1 / 1',
                        borderRadius: 16,
                        margin: '0 auto 6px',
                        background: `${c.color || catColor(c.id)}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={26} color={c.color || catColor(c.id)} />
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600 }}>{c.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '8px 16px 6px' }}>
            <SectionTitle
              title="Đang được yêu thích"
              sub="Chọn lọc theo đánh giá cao"
              action="Xem tất cả"
              onAction={() => goSearch('')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[...products]
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 4)
                .map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onOpen={openProduct}
                    fav={favs.has(p.id)}
                    onFav={toggleFav}
                    onAdd={addToCart}
                    flashSales={flashSales}
                  />
                ))}
            </div>
          </div>

          {/* ✅ ĐỢT 7: GỢI Ý CÁ NHÂN HOÁ - chỉ hiện khi khách đã đăng nhập và có ít nhất 1 tín hiệu (đã mua/đã yêu thích) */}
          {recommendedProducts.length > 0 && (
            <div style={{ padding: '10px 16px 6px' }}>
              <SectionTitle
                title="Có thể bạn thích"
                sub="Dựa trên sản phẩm bạn đã mua & yêu thích"
                action="Xem tất cả"
                onAction={() => goSearch('')}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {recommendedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onOpen={openProduct}
                    fav={favs.has(p.id)}
                    onFav={toggleFav}
                    onAdd={addToCart}
                    flashSales={flashSales}
                  />
                ))}
              </div>
            </div>
          )}

          {/* VÙNG ĐẶC SẢN - ĐÃ SỬA */}
          <div style={{ padding: '10px 16px 6px' }}>
            <SectionTitle
              title="Vùng đặc sản"
              sub="Ghé cửa hàng gần bạn"
              action="Xem bản đồ"
              onAction={() => setView('map')}
            />
            <div
              onClick={() => setView('map')}
              style={{
                cursor: 'pointer',
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid #EAE1CC',
                height: 130,
                position: 'relative',
                marginTop: 8,
              }}
            >
              {myLocation ? (
                <iframe
                  src={`https://maps.google.com/maps?q=${myLocation}&t=k&z=17&output=embed`}
                  width="100%"
                  height="130"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Bản đồ vị trí"
                ></iframe>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#EAE1CC',
                    fontSize: 13,
                    textAlign: 'center',
                    padding: '0 16px',
                    gap: 4,
                  }}
                >
                  {locationError ? (
                    <>
                      <span style={{ fontWeight: 600 }}>Không lấy được vị trí</span>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>
                        {locationError.code === 1 || /denied/i.test(locationError.message || '')
                          ? 'Quyền vị trí chưa thực sự được cấp. Vào Cài đặt > Ứng dụng > Vị Miền > Quyền, bật lại.'
                          : locationError.code === 2
                          ? 'Điện thoại đang tắt định vị (GPS/Location). Hãy bật ở thanh trạng thái nhanh rồi thử lại.'
                          : locationError.code === 3 || /timeout/i.test(locationError.message || '')
                          ? 'Tìm vị trí quá lâu (tín hiệu GPS yếu). Ra chỗ thoáng và thử lại.'
                          : `Lỗi: ${locationError.message}`}
                      </span>
                    </>
                  ) : (
                    'Đang tìm vị trí của bạn...'
                  )}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  zIndex: 1,
                }}
              ></div>
            </div>
          </div>

          <div style={{ padding: '10px 16px 90px' }}>
            <div
              style={{
                display: 'flex',
                gap: 10,
                background: `${C.dawn}1c`,
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
              }}
            >
              <Bell size={20} color={C.brick} />
              <div style={{ fontSize: 12.5 }}>
                <b>Ưu đãi mùa mưa:</b> giảm 10% cho đơn nước mắm & hải sản khô đầu tiên.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH */}
      {view === 'search' && (
        <div className="fade-in" style={{ padding: '0 16px 24px' }}>
          <div
            className="hide-scroll"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 10px' }}
          >
            <Pill active={catFilter === 'all'} onClick={() => setCatFilter('all')}>
              Tất cả
            </Pill>
            {categories.map((c) => (
              <Pill key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>
                {c.name}
              </Pill>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">Tất cả khu vực</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle}>
              <option value="popular">Phổ biến</option>
              <option value="rating">Đánh giá cao</option>
              <option value="priceAsc">Giá tăng dần</option>
              <option value="priceDesc">Giá giảm dần</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>
            {filtered.length} sản phẩm
          </div>
          {filtered.length === 0 ? (
            <EmptyState text="Không tìm thấy sản phẩm phù hợp. Thử đổi từ khoá hoặc bộ lọc." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onOpen={openProduct}
                  fav={favs.has(p.id)}
                  onFav={toggleFav}
                  onAdd={addToCart}
                  flashSales={flashSales}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRODUCT DETAIL */}
      {view === 'detail' &&
        productId &&
        (() => {
          const p = products.find((x) => x.id === productId);
          if (!p) return null;
          const Icon = iconFor(p.cat);
          const related = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
          return (
            <div className="fade-in">
              <div
                style={{
                  position: 'relative',
                  height: 240,
                  background: `linear-gradient(160deg, ${catColor(p.cat)}30, ${catColor(p.cat)}08)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={() => setView('search')}
                  style={{
                    ...iconBtn,
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    background: '#fff',
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  onClick={() => toggleFav(p.id)}
                  style={{
                    ...iconBtn,
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    background: '#fff',
                  }}
                >
                  <Heart
                    size={18}
                    fill={favs.has(p.id) ? C.brick : 'none'}
                    stroke={favs.has(p.id) ? C.brick : C.ink}
                  />
                </button>
                <Icon size={80} color={catColor(p.cat)} strokeWidth={1.2} />
              </div>
              <div style={{ padding: '18px 16px 100px' }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: C.pine,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MapPin size={12} /> {p.origin}
                </span>
                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 22,
                    fontWeight: 600,
                    margin: '6px 0',
                  }}
                >
                  {p.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Stars rating={p.rating} size={15} />{' '}
                  <span style={{ fontSize: 13, color: C.inkSoft }}>
                    {p.rating} · {p.reviews} đánh giá
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const { finalPrice, discountPercent } = getDiscountedPrice(p, flashSales);
                    if (discountPercent > 0) {
                      return (
                        <>
                          <span style={{ fontSize: 24, fontWeight: 800, color: C.brick }}>
                            {money(finalPrice)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#fff',
                              background: C.brick,
                              padding: '2px 8px',
                              borderRadius: 999,
                            }}
                          >
                            -{discountPercent}%
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              color: C.inkSoft,
                              textDecoration: 'line-through',
                            }}
                          >
                            {money(p.price)}
                          </span>
                        </>
                      );
                    }
                    return (
                      <span style={{ fontSize: 24, fontWeight: 800, color: C.brick }}>
                        {money(p.price)}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.inkSoft }}>/ {p.unit}</span>
                </div>

                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.inkSoft, margin: '14px 0' }}>
                  {p.desc}
                </p>

                <SectionTitle title="Hành trình sản phẩm" sub="Từ vùng nguyên liệu đến tay bạn" />
                <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0 18px' }}>
                  {[
                    'Thu hoạch tại ' + p.region,
                    'Sơ chế thủ công',
                    'Đóng gói kiểm định',
                    'Giao đến bạn',
                  ].map((s, i, arr) => (
                    <React.Fragment key={i}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: [C.night, C.brick, C.dawn, C.pine][i],
                            margin: '0 auto 6px',
                          }}
                        />
                        <div style={{ fontSize: 9.5, color: C.inkSoft, lineHeight: 1.3 }}>{s}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          style={{
                            height: 2,
                            flex: 0.6,
                            background: `linear-gradient(90deg, ${[C.night, C.brick, C.dawn][i]}, ${[C.brick, C.dawn, C.pine][i]})`,
                            marginBottom: 16,
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {p.story && (
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${C.paper}, ${C.sand}55)`,
                      border: `1px solid ${C.sandDeep}`,
                      borderRadius: 14,
                      padding: '18px 18px 18px 16px',
                      margin: '18px 0',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          background: `${C.brick}18`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Quote size={14} color={C.brick} />
                      </div>
                      <span
                        style={{
                          fontFamily: "'Fraunces',serif",
                          fontSize: 15.5,
                          fontWeight: 700,
                          color: C.night,
                        }}
                      >
                        Câu chuyện sản phẩm
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontStyle: 'italic',
                        fontSize: 14,
                        lineHeight: 1.75,
                        color: C.ink,
                        margin: 0,
                      }}
                    >
                      {p.story}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 12,
                        fontSize: 11.5,
                        color: C.inkSoft,
                        fontWeight: 600,
                      }}
                    >
                      <MapPin size={11} />
                      {p.origin}
                    </div>
                  </div>
                )}

                <SectionTitle
                  title="Đánh giá khách hàng"
                  sub={(() => {
                    const realCount = productReviews.length;
                    const combinedCount = p.reviews + realCount;
                    const combinedRating =
                      combinedCount > 0
                        ? (
                            (p.rating * p.reviews +
                              productReviews.reduce((s, r) => s + r.rating, 0)) /
                            combinedCount
                          ).toFixed(1)
                        : p.rating;
                    return `${combinedRating} trên 5 · ${combinedCount} lượt`;
                  })()}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  {productReviews.length === 0 ? (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: C.inkSoft,
                        textAlign: 'center',
                        padding: '16px 0',
                      }}
                    >
                      Chưa có đánh giá chi tiết nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ
                      cảm nhận sau khi nhận hàng!
                    </div>
                  ) : (
                    productReviews.map((r) => (
                      <div
                        key={r.firebaseId}
                        style={{
                          background: '#fff',
                          border: '1px solid #EAE1CC',
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <b style={{ fontSize: 12.5 }}>{r.userName || 'Khách hàng'}</b>
                          <Stars rating={r.rating} size={12} />
                        </div>
                        {r.comment && (
                          <div style={{ fontSize: 12.5, color: C.inkSoft }}>{r.comment}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {related.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <SectionTitle title="Sản phẩm liên quan" />
                    <div
                      className="hide-scroll"
                      style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingTop: 8 }}
                    >
                      {related.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => openProduct(r.id)}
                          style={{
                            minWidth: 130,
                            cursor: 'pointer',
                            border: '1px solid #EAE1CC',
                            borderRadius: 12,
                            padding: 10,
                            background: '#fff',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: 12, color: C.brick, fontWeight: 700 }}>
                            {money(r.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100%',
                  maxWidth: 480,
                  background: '#fff',
                  borderTop: '1px solid #EAE1CC',
                  padding: 12,
                  display: 'flex',
                  gap: 10,
                }}
              >
                <button
                  onClick={() => (currentUser ? setView('cart') : setShowLogin(true))}
                  style={{ ...iconBtn, width: 48, height: 48, border: '1px solid #EAE1CC' }}
                >
                  <ShoppingCart size={18} />
                </button>
                <button
                  onClick={() => addToCart(p.id)}
                  style={{
                    flex: 1,
                    background: C.night,
                    color: C.paper,
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Thêm vào giỏ · {money(getDiscountedPrice(p, flashSales).finalPrice)}
                </button>
              </div>
            </div>
          );
        })()}

      {/* MAP */}
      {view === 'map' && (
        <div className="fade-in" style={{ padding: '0 16px 24px' }}>
          <SectionTitle title="Cửa hàng & điểm bán" sub="Chọn một điểm để xem chi tiết" />
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #EAE1CC',
              marginTop: 8,
              height: 350,
            }}
          >
            {myLocation ? (
              <iframe
                src={`https://maps.google.com/maps?q=${myLocation}&t=k&z=17&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                allowFullScreen=""
                loading="lazy"
                title="Bản đồ vị trí"
              ></iframe>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#EAE1CC',
                  fontSize: 13,
                }}
              >
                Đang tìm vị trí của bạn...
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {STORES.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `${C.pine}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Store size={18} color={C.pine} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft }}>{s.addr}</div>
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    background: `${C.night}0f`,
                    color: C.night,
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  {s.region}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 80 }} />
        </div>
      )}

      {/* CART */}
      {view === 'cart' && (
        <div
          className="fade-in"
          style={{
            minHeight: 'calc(100vh - 120px)',
            background: C.paper,
            padding: '0 16px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 14px' }}>
            <button
              onClick={() => {
                setView('home');
                setCheckoutStep(1);
              }}
              style={iconBtn}
            >
              <ArrowLeft size={18} />
            </button>
            <h2
              style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 600, margin: 0 }}
            >
              Giỏ hàng
            </h2>
            {cartCount > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 13, color: C.inkSoft }}>
                {cartCount} sản phẩm
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 0',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `${C.night}08`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <ShoppingCart size={36} color={C.inkSoft} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                Giỏ hàng trống
              </p>
              <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20, textAlign: 'center' }}>
                Khám phá đặc sản để bắt đầu mua sắm.
              </p>
              <button
                onClick={() => {
                  setView('home');
                  setCheckoutStep(1);
                }}
                style={{
                  background: C.night,
                  color: C.paper,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Khám phá ngay
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {cart.map((item) => {
                  const p = products.find((x) => x.id === item.id);

                  // === SỬA PHẦN NÀY: Hiển thị thông báo nếu sản phẩm bị xóa ===
                  if (!p) {
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          gap: 12,
                          background: '#fff',
                          border: '1px solid #f5c6c6',
                          borderRadius: 12,
                          padding: 12,
                          backgroundColor: '#fde8e8',
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 10,
                            background: '#f5c6c6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <AlertCircle size={24} color={C.brick} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              color: C.brick,
                              marginBottom: 2,
                            }}
                          >
                            ⚠️ Sản phẩm đã bị xóa
                          </div>
                          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
                            Sản phẩm này không còn tồn tại trong hệ thống
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#fff',
                              background: C.brick,
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 14px',
                              cursor: 'pointer',
                            }}
                          >
                            Xóa khỏi giỏ
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // === PHẦN RENDER BÌNH THƯỜNG (giữ nguyên) ===
                  const Icon = iconFor(p.cat);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        background: '#fff',
                        border: '1px solid #EAE1CC',
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 10,
                          background: `${catColor(p.cat)}18`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={24} color={catColor(p.cat)} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 13, color: C.brick, fontWeight: 700 }}>
                          {money(getDiscountedPrice(p, flashSales).finalPrice)}
                          {getDiscountedPrice(p, flashSales).discountPercent > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                color: C.inkSoft,
                                fontWeight: 500,
                                textDecoration: 'line-through',
                                marginLeft: 6,
                              }}
                            >
                              {money(p.price)}
                            </span>
                          )}
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}
                        >
                          <button
                            onClick={() => changeQty(item.id, -1)}
                            style={{
                              ...qtyBtn,
                              border: '1px solid #EAE1CC',
                              borderRadius: 6,
                              width: 28,
                              height: 28,
                            }}
                          >
                            <Minus size={12} />
                          </button>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              minWidth: 28,
                              textAlign: 'center',
                            }}
                          >
                            {item.qty}
                          </span>
                          <button
                            onClick={() => changeQty(item.id, 1)}
                            style={{
                              ...qtyBtn,
                              border: '1px solid #EAE1CC',
                              borderRadius: 6,
                              width: 28,
                              height: 28,
                            }}
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{
                              marginLeft: 'auto',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <Trash2 size={16} color={C.brick} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 16,
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <SectionTitle
                  title="Phương thức vận chuyển"
                  sub={
                    isGeocodingAddress
                      ? 'Đang xác định vị trí theo địa chỉ giao hàng...'
                      : nearestStoreDistanceKm != null
                      ? `Cách cửa hàng gần nhất khoảng ${nearestStoreDistanceKm.toFixed(1)} km${
                          addressLocation ? ' (theo địa chỉ giao hàng)' : ' (theo vị trí GPS)'
                        }`
                      : addressGeocodeFailed
                      ? 'Không xác định được địa chỉ, phí ship tạm tính mức trung bình'
                      : 'Nhập địa chỉ giao hàng đầy đủ để tính phí ship chính xác hơn'
                  }
                />
                {multiProductDiscountPercent > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: `${C.pine}12`,
                      color: C.pine,
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '6px 10px',
                      borderRadius: 8,
                      marginTop: 8,
                    }}
                  >
                    <Gift size={13} />
                    Đang được giảm {Math.round(multiProductDiscountPercent * 100)}% phí ship vì mua{' '}
                    {distinctProductCount} loại sản phẩm khác nhau!
                  </div>
                ) : (
                  distinctProductCount === 1 && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: C.inkSoft,
                        marginTop: 8,
                      }}
                    >
                      💡 Mua thêm loại sản phẩm khác để được giảm đến 40% phí ship!
                    </div>
                  )
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {[
                    {
                      id: 'standard',
                      label: 'Giao hàng tiêu chuẩn',
                      fee: shippingFeeStandard,
                      hint: '2-4 ngày',
                    },
                    {
                      id: 'express',
                      label: 'Giao hàng hoả tốc',
                      fee: shippingFeeExpress,
                      hint: 'Trong 24h',
                    },
                  ].map((opt) => {
                    const discountedFee = Math.round(opt.fee * (1 - multiProductDiscountPercent));
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setShippingMethod(opt.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          border: `1.5px solid ${shippingMethod === opt.id ? C.night : '#EAE1CC'}`,
                          borderRadius: 12,
                          padding: 12,
                          cursor: 'pointer',
                          background: shippingMethod === opt.id ? `${C.night}08` : '#fff',
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            border: `2px solid ${C.night}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {shippingMethod === opt.id && (
                            <div style={{ width: 9, height: 9, borderRadius: 999, background: C.night }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: C.inkSoft }}>{opt.hint}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {multiProductDiscountPercent > 0 && (
                            <div
                              style={{
                                fontSize: 11,
                                color: C.inkSoft,
                                textDecoration: 'line-through',
                              }}
                            >
                              {money(opt.fee)}
                            </div>
                          )}
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.brick }}>
                            {money(discountedFee)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid #EAE1CC',
                  background: '#fff',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <Row label="Tạm tính" value={money(cartTotal)} />
                {multiProductShippingDiscount > 0 && (
                  <Row
                    label="Giảm giá ship (mua nhiều loại)"
                    value={'-' + money(multiProductShippingDiscount)}
                  />
                )}
                <Row label="Phí vận chuyển" value={money(shippingFee)} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    fontWeight: 700,
                    fontSize: 16,
                    color: C.brick,
                  }}
                >
                  <span>Tổng cộng</span>
                  <span>{money(finalTotal)}</span>
                </div>
                <button
                  onClick={() => {
                    setCheckoutStep(1);
                    setView('checkout');
                  }}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    background: C.night,
                    color: C.paper,
                    border: 'none',
                    borderRadius: 12,
                    padding: 14,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Tiến hành thanh toán
                </button>
              </div>
            </>
          )}
          <div style={{ height: 80 }} />
        </div>
      )}

      {/* CHECKOUT - ĐÃ SỬA */}
      {view === 'checkout' && (
        <div
          className="fade-in"
          style={{ padding: '0 16px 24px', minHeight: 'calc(100vh - 120px)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 14px' }}>
            <button
              onClick={() => {
                if (checkoutStep === 4) {
                  setCheckoutStep(1);
                  setView('home');
                } else {
                  setView('cart');
                }
              }}
              style={iconBtn}
            >
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ ...pageTitle, margin: 0 }}>Đặt hàng & thanh toán</h2>
          </div>

          <Steps step={checkoutStep} />

          {/* Kiểm tra đăng nhập */}
          {!currentUser ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `${C.night}08`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <LogIn size={36} color={C.inkSoft} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                Vui lòng đăng nhập
              </p>
              <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
                Bạn cần đăng nhập để tiến hành thanh toán
              </p>
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  background: C.night,
                  color: C.paper,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Đăng nhập ngay
              </button>
              <button
                onClick={() => {
                  setCheckoutStep(1);
                  setView('cart');
                }}
                style={{
                  marginTop: 10,
                  background: 'transparent',
                  color: C.inkSoft,
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: '12px 32px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Quay lại giỏ hàng
              </button>
            </div>
          ) : (
            // ===== PHẦN CHECKOUT BÌNH THƯỜNG =====
            <>
              {checkoutStep === 1 && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle title="Thông tin nhận hàng" />

                  {/* Họ tên */}
                  <div style={{ marginTop: 8 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Họ tên người nhận *
                    </label>
                    <input
                      type="text"
                      value={currentUser?.name || ''}
                      onChange={(e) => {
                        if (currentUser) {
                          setCurrentUser({ ...currentUser, name: e.target.value });
                        }
                      }}
                      placeholder="Nhập họ tên"
                      style={{
                        width: '100%',
                        border: '1px solid #EAE1CC',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Số điện thoại */}
                  <div style={{ marginTop: 8 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Số điện thoại *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0987654321"
                      style={{
                        width: '100%',
                        border: '1px solid #EAE1CC',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div style={{ marginTop: 8 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      style={{
                        width: '100%',
                        border: '1px solid #EAE1CC',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        outline: 'none',
                        background: '#f5f5f5',
                      }}
                    />
                  </div>

                  {/* Địa chỉ giao hàng */}
                  <div style={{ marginTop: 8 }}>
                    <label
                      style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
                    >
                      Địa chỉ giao hàng *
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      style={{
                        width: '100%',
                        border: '1px solid #EAE1CC',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        resize: 'none',
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!customerPhone.trim()) {
                        showToast('Vui lòng nhập số điện thoại');
                        return;
                      }
                      if (!address.trim()) {
                        showToast('Vui lòng nhập địa chỉ giao hàng');
                        return;
                      }
                      setCheckoutStep(2);
                    }}
                    style={{ ...primaryBtn, marginTop: 12 }}
                  >
                    Tiếp tục
                  </button>
                </div>
              )}

              {checkoutStep === 2 && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle title="Phương thức thanh toán" />

                  {/* COD - Thanh toán khi nhận hàng */}
                  <div
                    onClick={() => {
                      setPayMethod('cod');
                      setShowBankTransfer(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      border: `1.5px solid ${payMethod === 'cod' ? C.night : '#EAE1CC'}`,
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 8,
                      cursor: 'pointer',
                      background: payMethod === 'cod' ? `${C.night}08` : '#fff',
                    }}
                  >
                    <Truck size={18} color={C.night} />
                    <span style={{ fontSize: 13, flex: 1 }}>Thanh toán khi nhận hàng (COD)</span>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: `2px solid ${C.night}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {payMethod === 'cod' && (
                        <div
                          style={{ width: 9, height: 9, borderRadius: 999, background: C.night }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Chuyển khoản ngân hàng */}
                  <div
                    onClick={() => {
                      setPayMethod('bank');
                      setShowBankTransfer(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      border: `1.5px solid ${payMethod === 'bank' ? C.night : '#EAE1CC'}`,
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 8,
                      cursor: 'pointer',
                      background: payMethod === 'bank' ? `${C.night}08` : '#fff',
                    }}
                  >
                    <ClipboardList size={18} color={C.night} />
                    <span style={{ fontSize: 13, flex: 1 }}>Chuyển khoản ngân hàng</span>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: `2px solid ${C.night}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {payMethod === 'bank' && (
                        <div
                          style={{ width: 9, height: 9, borderRadius: 999, background: C.night }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Hiển thị thông tin chuyển khoản khi chọn */}
                  {showBankTransfer && payMethod === 'bank' && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#fff',
                        border: '1px solid #EAE1CC',
                        borderRadius: 12,
                        animation: 'fadeIn 0.3s ease',
                      }}
                    >
                      <div
                        style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.night }}
                      >
                        💳 Thông tin chuyển khoản
                      </div>

                      {/* Chọn hình thức thanh toán */}
                      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <button
                          onClick={() => setBankMethod('qr')}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: `2px solid ${bankMethod === 'qr' ? C.night : '#EAE1CC'}`,
                            borderRadius: 8,
                            background: bankMethod === 'qr' ? `${C.night}08` : '#fff',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            color: bankMethod === 'qr' ? C.night : C.inkSoft,
                          }}
                        >
                          📱 Quét mã QR
                        </button>
                        <button
                          onClick={() => setBankMethod('bank')}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: `2px solid ${bankMethod === 'bank' ? C.night : '#EAE1CC'}`,
                            borderRadius: 8,
                            background: bankMethod === 'bank' ? `${C.night}08` : '#fff',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            color: bankMethod === 'bank' ? C.night : C.inkSoft,
                          }}
                        >
                          🏦 Thông tin tài khoản
                        </button>
                      </div>

                      {bankMethod === 'qr' ? (
                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              background: '#f8f8f8',
                              padding: 20,
                              borderRadius: 12,
                              border: '1px dashed #ccc',
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 220,
                                background: '#fff',
                                margin: '0 auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                overflow: 'hidden',
                              }}
                            >
                              <img
                                src="/images/payment/qr-chuyen-khoan.png"
                                alt="QR Code chuyển khoản ngân hàng"
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                              />
                            </div>
                            <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8 }}>
                              Quét mã QR để chuyển khoản nhanh chóng
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: C.brick,
                                marginTop: 4,
                              }}
                            >
                              Số tiền: {money(cartTotal)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            style={{
                              background: '#f8f8f8',
                              padding: 14,
                              borderRadius: 10,
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: '1px solid #eee',
                              }}
                            >
                              <span style={{ fontSize: 12.5, color: C.inkSoft }}>Ngân hàng</span>
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>Vietcombank</span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: '1px solid #eee',
                              }}
                            >
                              <span style={{ fontSize: 12.5, color: C.inkSoft }}>
                                Chủ tài khoản
                              </span>
                              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                                CÔNG TY VỊ MIỀN
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: '1px solid #eee',
                              }}
                            >
                              <span style={{ fontSize: 12.5, color: C.inkSoft }}>Số tài khoản</span>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.brick }}>
                                1234567890
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                              }}
                            >
                              <span style={{ fontSize: 12.5, color: C.inkSoft }}>
                                Nội dung chuyển
                              </span>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.night }}>
                                DH{Math.floor(1000 + Math.random() * 9000)}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              background: `${C.night}08`,
                              padding: 12,
                              borderRadius: 10,
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                marginBottom: 8,
                                color: C.night,
                              }}
                            >
                              🛒 Thông tin đơn hàng
                            </div>

                            {cart.map((item) => {
                              const p = products.find((x) => x.id === item.id);
                              if (!p) {
                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      padding: '6px 0',
                                      fontSize: 12.5,
                                      borderBottom: '1px solid #f5c6c6',
                                      backgroundColor: '#fde8e8',
                                      borderRadius: 6,
                                      paddingLeft: 8,
                                      paddingRight: 8,
                                      marginBottom: 4,
                                    }}
                                  >
                                    <span style={{ color: C.brick }}>
                                      ⚠️ Sản phẩm đã bị xóa (ID: {item.id})
                                    </span>
                                    <span style={{ color: C.brick, fontWeight: 700 }}>
                                      {money(0)}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 0',
                                    fontSize: 12.5,
                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                  }}
                                >
                                  <span>
                                    {p.name} x{item.qty}
                                  </span>
                                  <span>{money(p.price * item.qty)}</span>
                                </div>
                              );
                            })}

                            {cart.some((item) => !products.find((p) => p.id === item.id)) && (
                              <div
                                style={{
                                  padding: '10px',
                                  backgroundColor: '#fde8e8',
                                  borderRadius: 8,
                                  marginTop: 8,
                                  border: '1px solid #f5c6c6',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: C.brick,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <AlertCircle size={16} />
                                  ⚠️ Có sản phẩm trong giỏ hàng đã bị xóa khỏi hệ thống
                                </div>
                                <button
                                  onClick={() => {
                                    const validCart = cart.filter((item) =>
                                      products.find((p) => p.id === item.id)
                                    );
                                    setCart(validCart);
                                    showToast('Đã xóa sản phẩm không hợp lệ khỏi giỏ hàng');
                                  }}
                                  style={{
                                    marginTop: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#fff',
                                    background: C.brick,
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Xóa sản phẩm lỗi khỏi giỏ
                                </button>
                              </div>
                            )}

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                fontSize: 12.5,
                              }}
                            >
                              <span>Phí vận chuyển ({shippingMethod === 'express' ? 'hoả tốc' : 'tiêu chuẩn'})</span>
                              <span>{money(shippingFee)}</span>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 0 4px',
                                fontWeight: 700,
                                fontSize: 14,
                                color: C.brick,
                                borderTop: '2px solid rgba(0,0,0,0.1)',
                              }}
                            >
                              <span>Tổng cộng</span>
                              <span>{money(cartTotal + shippingFee)}</span>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: C.inkSoft,
                              textAlign: 'center',
                              padding: 8,
                              background: `${C.dawn}15`,
                              borderRadius: 8,
                            }}
                          >
                            ⚠️ Vui lòng chuyển khoản đúng số tiền và nội dung để được xác nhận đơn
                            hàng
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    disabled={isPlacingOrder}
                    onClick={() => {
                      const hasInvalidProducts = cart.some(
                        (item) => !products.find((p) => p.id === item.id)
                      );
                      if (hasInvalidProducts) {
                        showToast('⚠️ Có sản phẩm trong giỏ đã bị xóa! Vui lòng kiểm tra lại.');
                        const validCart = cart.filter((item) =>
                          products.find((p) => p.id === item.id)
                        );
                        setCart(validCart);
                        return;
                      }

                      const outOfStock = cart.some((item) => {
                        const product = products.find((p) => p.id === item.id);
                        return product && !product.stock;
                      });
                      if (outOfStock) {
                        showToast('⚠️ Có sản phẩm đã hết hàng! Vui lòng kiểm tra lại.');
                        return;
                      }

                      if (payMethod === 'bank' && !showBankTransfer) {
                        setShowBankTransfer(true);
                        return;
                      }
                      if (payMethod === 'bank' && showBankTransfer) {
                        if (
                          window.confirm(
                            'Bạn đã chuyển khoản thành công? Nhấn OK để xác nhận đơn hàng.'
                          )
                        ) {
                          completeOrder();
                        }
                      } else if (payMethod === 'cod') {
                        setCheckoutStep(3);
                      } else {
                        showToast('Vui lòng chọn phương thức thanh toán');
                      }
                    }}
                    style={{
                      ...primaryBtn,
                      marginTop: 12,
                      opacity: isPlacingOrder ? 0.6 : 1,
                      cursor: isPlacingOrder ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isPlacingOrder
                      ? 'Đang xử lý...'
                      : payMethod === 'bank' && showBankTransfer
                        ? 'Xác nhận đã thanh toán'
                        : 'Tiếp tục'}
                  </button>
                </div>
              )}

              {checkoutStep === 3 && (
                <div style={{ marginTop: 16 }}>
                  <SectionTitle title="Xác nhận đơn hàng" />

                  {userVouchers.filter((v) => v.status === 'Chưa dùng').length > 0 && (
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <label
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          display: 'block',
                          marginBottom: 4,
                        }}
                      >
                        🎟️ Áp dụng voucher (không bắt buộc)
                      </label>
                      <select
                        value={selectedVoucherId}
                        onChange={(e) => setSelectedVoucherId(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #EAE1CC',
                          borderRadius: 10,
                          padding: '10px 12px',
                          fontSize: 13,
                          outline: 'none',
                          background: '#fff',
                        }}
                      >
                        <option value="">Không dùng voucher</option>
                        {userVouchers
                          .filter((v) => v.status === 'Chưa dùng')
                          .map((v) => (
                            <option key={v.firebaseId} value={v.firebaseId}>
                              {v.rewardName} ({v.code})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #EAE1CC',
                      borderRadius: 12,
                      padding: 12,
                      marginTop: 8,
                      fontSize: 12.5,
                    }}
                  >
                    <Row label="Giao đến" value={address} />
                    <Row
                      label="Thanh toán"
                      value={{ cod: 'COD', card: 'Thẻ', bank: 'Chuyển khoản' }[payMethod]}
                    />
                    <Row label="Số sản phẩm" value={cartCount + ' sản phẩm'} />
                    <Row label="Tạm tính" value={money(cartTotal)} />
                    <Row
                      label={`Phí vận chuyển (${shippingMethod === 'express' ? 'hoả tốc' : 'tiêu chuẩn'})`}
                      value={money(shippingFeeBase)}
                    />
                    {multiProductShippingDiscount > 0 && (
                      <Row
                        label={`Giảm ship (${distinctProductCount} loại sản phẩm)`}
                        value={'-' + money(multiProductShippingDiscount)}
                      />
                    )}
                    {voucherDiscount > 0 && (
                      <Row label="Giảm giá voucher" value={'-' + money(voucherDiscount)} />
                    )}
                    {shippingDiscount > 0 && (
                      <Row label="Voucher miễn phí ship" value={'-' + money(shippingDiscount)} />
                    )}
                    <Row label="Tổng cộng" value={money(finalTotal)} bold />
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={isPlacingOrder}
                    style={{
                      ...primaryBtn,
                      marginTop: 12,
                      opacity: isPlacingOrder ? 0.6 : 1,
                      cursor: isPlacingOrder ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isPlacingOrder ? 'Đang xử lý...' : 'Đặt hàng ngay'}
                  </button>
                </div>
              )}

              {checkoutStep === 4 && (
                <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 999,
                      background: `${C.pine}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Check size={28} color={C.pine} />
                  </div>
                  <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 19, marginBottom: 6 }}>
                    Đặt hàng thành công!
                  </h3>
                  <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20 }}>
                    Đơn hàng #{orders[0]?.id} đang được xử lý.
                  </p>
                  <div
                    style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}
                  >
                    <button
                      onClick={() => {
                        setCheckoutStep(1);
                        setView('account');
                      }}
                      style={{
                        background: C.night,
                        color: C.paper,
                        border: 'none',
                        borderRadius: 12,
                        padding: '10px 22px',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Xem đơn hàng
                    </button>
                    <button
                      onClick={() => {
                        setCheckoutStep(1);
                        setView('home');
                      }}
                      style={{
                        background: 'transparent',
                        color: C.night,
                        border: '1px solid #EAE1CC',
                        borderRadius: 12,
                        padding: '10px 22px',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Về trang chủ
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ACCOUNT */}
      {view === 'account' && (
        <div
          className="fade-in"
          style={{ minHeight: 'calc(100vh - 120px)', background: C.paper, padding: '0 16px 24px' }}
        >
          {/* ... phần header ... */}

          {/* ===== ĐIỂM THƯỞNG & HẠNG THÀNH VIÊN ===== */}
          {!isAdmin && currentUser && (
            <div
              style={{
                background: `linear-gradient(135deg, ${C.night} 0%, ${C.pine} 100%)`,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                color: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>Hạng thành viên</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {(getTierInfo(currentUser.lifetimePoints || 0)).badge}{' '}
                    {getTierInfo(currentUser.lifetimePoints || 0).name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>Điểm khả dụng</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{currentUser.points || 0}</div>
                </div>
              </div>
              {(() => {
                const lifetime = currentUser.lifetimePoints || 0;
                const currentTierIdx = TIERS.findIndex((t) => t.name === getTierInfo(lifetime).name);
                const nextTier = TIERS[currentTierIdx - 1]; // TIERS sắp xếp giảm dần theo min
                if (!nextTier) return null;
                const remain = nextTier.min - lifetime;
                return (
                  <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 8 }}>
                    Còn {remain} điểm tích luỹ nữa để lên hạng {nextTier.badge} {nextTier.name}
                  </div>
                );
              })()}
              <button
                onClick={() => setView('rewards')}
                style={{
                  marginTop: 12,
                  width: '100%',
                  background: '#fff',
                  color: C.night,
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 0',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🎁 Đổi điểm lấy quà / voucher
              </button>
            </div>
          )}

          {/* ===== GIỚI THIỆU BẠN BÈ ===== */}
          {!isAdmin && currentUser && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #EAE1CC',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Users size={18} color={C.pine} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Giới thiệu bạn bè</span>
              </div>
              <p style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10, lineHeight: 1.5 }}>
                Chia sẻ mã dưới đây cho bạn bè. Khi bạn của bạn đăng ký bằng mã này và hoàn tất đơn
                hàng đầu tiên, bạn nhận <b>100 điểm</b>, bạn ấy nhận <b>50 điểm</b>.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    background: C.paper,
                    border: '1px dashed #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: 1,
                    textAlign: 'center',
                  }}
                >
                  {currentUser.referralCode || '—'}
                </div>
                <button
                  onClick={() => {
                    if (currentUser.referralCode) {
                      navigator.clipboard.writeText(currentUser.referralCode);
                      showToast('Đã sao chép mã giới thiệu!');
                    }
                  }}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    background: C.pine,
                    color: '#fff',
                    padding: '0 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ClipboardList size={14} /> Sao chép
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              background: '#fff',
              border: '1px solid #EAE1CC',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>Đơn hàng của tôi</span>
              {/* ✅ SỬA: Chỉ đếm đơn hàng của user hiện tại */}
              {(() => {
                const userOrders = orders.filter((o) => o.userId === currentUser?.id);
                const processing = userOrders.filter(
                  (o) =>
                    o.status === 'Đang giao' ||
                    o.status === 'Đang xử lý' ||
                    o.status === 'Đang đóng gói'
                );
                return (
                  processing.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        background: '#FFF3E0',
                        color: '#E65100',
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontWeight: 600,
                      }}
                    >
                      {processing.length} đang xử lý
                    </span>
                  )
                );
              })()}
            </div>
            {/* ✅ SỬA: Chỉ hiển thị đơn hàng của user hiện tại */}
            {(() => {
              const userOrders = orders.filter((o) => o.userId === currentUser?.id);
              if (userOrders.length === 0) {
                return <div style={{ fontSize: 13, color: C.inkSoft }}>Chưa có đơn hàng nào.</div>;
              }
              return userOrders.map((o) => (
                <div
                  key={o.firebaseId || o.id}
                  onClick={() => {
                    setSelectedOrder(o);
                    setShowOrderDetail(true);
                  }}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #EAE1CC',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: C.inkSoft }}>#{o.id}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          o.status === 'Đã giao'
                            ? C.pine
                            : o.status === 'Đang giao'
                              ? C.dawn
                              : o.status === 'Đang đóng gói'
                                ? '#B8860B'
                                : o.status === 'Đã hủy'
                                  ? '#999'
                                  : C.brick,
                      }}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                    {o.date} · {money(o.total)}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #EAE1CC',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              Yêu thích ({favs.size})
            </div>
            {favs.size === 0 ? (
              <div style={{ fontSize: 13, color: C.inkSoft }}>Chưa có sản phẩm yêu thích.</div>
            ) : (
              <div className="hide-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
                {[...favs].slice(0, 5).map((id) => {
                  const p = products.find((x) => x.id === id);
                  return p ? (
                    <div
                      key={id}
                      onClick={() => openProduct(id)}
                      style={{
                        minWidth: 100,
                        cursor: 'pointer',
                        border: '1px solid #EAE1CC',
                        borderRadius: 8,
                        padding: 8,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: C.brick }}>{money(p.price)}</div>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isAdmin && (
              <button
                onClick={() => setView('admin')}
                style={{
                  ...secondaryBtn,
                  background: C.night,
                  color: C.paper,
                  borderColor: C.night,
                }}
              >
                <Shield size={16} style={{ marginRight: 6 }} /> Kênh quản trị
              </button>
            )}

            {/* Nút mở khung chat trực tiếp với Admin — chỉ hiện cho khách hàng, Admin không tự chat với chính mình */}
            {!isAdmin && (
              <button
                onClick={() => setShowContact(true)}
                style={{
                  ...secondaryBtn,
                  background: C.dawn,
                  color: C.night,
                  borderColor: C.dawn,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  position: 'relative',
                }}
              >
                <MessageCircle size={16} /> Chat với Admin
                {myChatMeta?.unreadForUser > 0 && (
                  <span
                    style={{
                      background: C.brick,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: '2px 7px',
                      marginLeft: 2,
                    }}
                  >
                    {myChatMeta.unreadForUser}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleLogout}
              style={{
                ...secondaryBtn,
                background: '#fff',
                color: C.brick,
                borderColor: '#FADBD8',
              }}
            >
              <LogOut size={16} style={{ marginRight: 6 }} /> Đăng xuất
            </button>
          </div>
          <div style={{ height: 100 }} />
        </div>
      )}

      {/* ===== TRANG ĐỔI QUÀ / VOUCHER ===== */}
      {view === 'rewards' && currentUser && (
        <div className="fade-in" style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 14px' }}>
            <button onClick={() => setView('account')} style={iconBtn}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ ...pageTitle, margin: 0 }}>Đổi điểm lấy quà</h2>
          </div>

          <div
            style={{
              background: `linear-gradient(135deg, ${C.night} 0%, ${C.pine} 100%)`,
              borderRadius: 14,
              padding: 14,
              color: '#fff',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13 }}>Điểm khả dụng của bạn</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{currentUser.points || 0} điểm</span>
          </div>

          <SectionTitle title="Danh sách quà / voucher" />
          {rewardsLoading ? (
            <div style={{ fontSize: 13, color: C.inkSoft, padding: '12px 0' }}>Đang tải...</div>
          ) : rewardsList.length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkSoft, padding: '12px 0' }}>
              Hiện chưa có quà nào, quay lại sau nhé!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {rewardsList.map((r) => {
                const canRedeem = (currentUser.points || 0) >= r.pointsCost;
                return (
                  <div
                    key={r.firebaseId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#fff',
                      border: '1px solid #EAE1CC',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 26 }}>
                      {r.discountType === 'freeship' ? '🚚' : r.discountType === 'gift' ? '🎁' : '🏷️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                        {r.pointsCost} điểm
                        {r.discountType === 'fixed' && ` · Giảm ${money(r.discountValue)}`}
                      </div>
                    </div>
                    <button
                      disabled={!canRedeem}
                      onClick={() => handleRedeemReward(r)}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: canRedeem ? 'pointer' : 'not-allowed',
                        background: canRedeem ? C.brick : '#eee',
                        color: canRedeem ? '#fff' : '#999',
                      }}
                    >
                      Đổi ngay
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <SectionTitle title="Ví voucher của tôi" />
          {userVouchers.filter((v) => v.status === 'Chưa dùng').length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkSoft, padding: '12px 0' }}>
              Bạn chưa có voucher nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {userVouchers
                .filter((v) => v.status === 'Chưa dùng')
                .map((v) => (
                  <div
                    key={v.firebaseId}
                    style={{
                      border: `1px dashed ${C.dawn}`,
                      borderRadius: 12,
                      padding: 12,
                      background: `${C.dawn}0D`,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{v.rewardName}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.brick, letterSpacing: 1 }}>
                      {v.code}
                    </div>
                    <div style={{ fontSize: 11, color: C.inkSoft }}>
                      Áp dụng ở bước thanh toán khi đặt hàng
                    </div>
                  </div>
                ))}
            </div>
          )}
          <div style={{ height: 60 }} />
        </div>
      )}

      {/* ADMIN */}
      {view === 'admin' && isAdmin && (
        <div className="fade-in" style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 14px' }}>
            <button onClick={() => setView('account')} style={iconBtn}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ ...pageTitle, margin: 0 }}>Quản trị cửa hàng</h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <AdminTabButton
              icon={Package}
              active={adminTab === 'products'}
              onClick={() => setAdminTab('products')}
            >
              Sản phẩm
            </AdminTabButton>
            <AdminTabButton
              icon={Leaf}
              active={adminTab === 'categories'}
              onClick={() => setAdminTab('categories')}
            >
              Danh mục
            </AdminTabButton>
            <AdminTabButton
              icon={ClipboardList}
              active={adminTab === 'orders'}
              onClick={() => setAdminTab('orders')}
            >
              Đơn hàng
            </AdminTabButton>
            <AdminTabButton
              icon={Users}
              active={adminTab === 'users'}
              onClick={() => setAdminTab('users')}
            >
              Người dùng
            </AdminTabButton>
            <AdminTabButton
              icon={MessageCircle}
              active={adminTab === 'messages'}
              onClick={() => setAdminTab('messages')}
              badge={adminChats
                .filter((c) => !adminAccountIds.has(c.firebaseId))
                .reduce((s, c) => s + (c.unreadForAdmin || 0), 0)}
            >
              Tin nhắn
            </AdminTabButton>
            <AdminTabButton
              icon={Gift}
              active={adminTab === 'rewards'}
              onClick={() => setAdminTab('rewards')}
            >
              Quà tặng
            </AdminTabButton>
            <AdminTabButton
              icon={Zap}
              active={adminTab === 'flashsale'}
              onClick={() => setAdminTab('flashsale')}
            >
              Flash Sale
            </AdminTabButton>
            <AdminTabButton
              icon={BarChart3}
              active={adminTab === 'stats'}
              onClick={() => setAdminTab('stats')}
            >
              Thống kê
            </AdminTabButton>
          </div>

          {adminTab === 'products' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>Banner trang chủ</span>
                <div
                  style={{
                    width: '100%',
                    height: 90,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: bannerImage
                      ? `#f5f5f5 url(${bannerImage}) center/cover no-repeat`
                      : `linear-gradient(160deg, ${C.night} 0%, ${C.nightSoft} 45%, ${C.pine} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!bannerImage && (
                    <span style={{ fontSize: 11, color: '#fff', opacity: 0.7 }}>
                      Đang dùng nền mặc định
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label
                    style={{
                      flex: 1,
                      border: '1px solid #EAE1CC',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: '#fff',
                    }}
                  >
                    {bannerImage ? 'Đổi ảnh banner' : 'Tải ảnh banner lên'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {bannerImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setBannerImage('');
                        showToast('Đã khôi phục nền mặc định');
                      }}
                      style={{
                        border: '1px solid #EAE1CC',
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: '#fff',
                        color: '#B33A3A',
                      }}
                    >
                      Xoá ảnh
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>Đồng bộ danh mục sản phẩm mẫu</span>
                <span style={{ fontSize: 11.5, color: C.inkSoft }}>
                  Chỉ thêm mới các sản phẩm mẫu có trong code nhưng chưa có trên Firestore. Sản
                  phẩm đã tồn tại (kể cả ảnh/tên/giá bạn đã chỉnh sửa) sẽ được giữ nguyên hoàn toàn.
                </span>
                <button
                  type="button"
                  onClick={handleSyncSampleProducts}
                  disabled={syncingProducts}
                  style={{
                    marginTop: 4,
                    border: `1px solid ${C.night}`,
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: syncingProducts ? 'default' : 'pointer',
                    background: syncingProducts ? '#EAE1CC' : C.night,
                    color: syncingProducts ? C.inkSoft : '#fff',
                  }}
                >
                  {syncingProducts ? 'Đang đồng bộ...' : '🔄 Đồng bộ ngay'}
                </button>
              </div>

              <button
                onClick={openAddForm}
                style={{
                  ...secondaryBtn,
                  borderStyle: 'dashed',
                  background: `${C.night}08`,
                  color: C.night,
                }}
              >
                <Plus size={16} style={{ marginRight: 6 }} /> Thêm sản phẩm mới
              </button>
              {products.map((p) => {
                const Icon = iconFor(p.cat);
                // === THÊM DÒNG NÀY: Kiểm tra sản phẩm có trong giỏ hàng không ===
                const inCart = cart.some((item) => item.id === p.id);
                // === THÊM DÒNG NÀY: Kiểm tra sản phẩm có trong yêu thích không ===
                const inFav = favs.has(p.id);

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      background: '#fff',
                      border: '1px solid #EAE1CC',
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: `${catColor(p.cat)}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} color={catColor(p.cat)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.inkSoft }}>
                        {money(p.price)} · {p.stock !== false ? 'Còn hàng' : 'Hết hàng'}
                        {/* === THÊM PHẦN NÀY: Hiển thị trạng thái đang trong giỏ hàng === */}
                        {inCart && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              background: C.brick,
                              color: '#fff',
                              padding: '1px 8px',
                              borderRadius: 999,
                              display: 'inline-block',
                            }}
                          >
                            🛒 Trong giỏ hàng
                          </span>
                        )}
                        {/* === THÊM PHẦN NÀY: Hiển thị trạng thái được yêu thích === */}
                        {inFav && !inCart && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              background: C.dawn,
                              color: '#fff',
                              padding: '1px 8px',
                              borderRadius: 999,
                              display: 'inline-block',
                            }}
                          >
                            ❤️ Yêu thích
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEditForm(p)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.night,
                          background: 'none',
                          border: `1px solid ${C.night}55`,
                          borderRadius: 8,
                          padding: '5px 9px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={12} style={{ marginRight: 2 }} /> Sửa
                      </button>

                      {/* === SỬA NÚT XÓA: Thêm điều kiện disabled === */}
                      <button
                        onClick={() => deleteProduct(p.id)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: inCart ? '#999' : C.brick,
                          background: 'none',
                          border: `1px solid ${inCart ? '#ddd' : C.brick + '55'}`,
                          borderRadius: 8,
                          padding: '5px 9px',
                          cursor: inCart ? 'not-allowed' : 'pointer',
                          opacity: inCart ? 0.5 : 1,
                        }}
                        disabled={inCart}
                        title={
                          inCart
                            ? '❌ Không thể xóa sản phẩm đang có trong giỏ hàng'
                            : 'Xóa sản phẩm'
                        }
                      >
                        <Trash2 size={12} style={{ marginRight: 2 }} /> Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {adminTab === 'categories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* === THÊM DANH MỤC MỚI === */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>Tạo danh mục mới</span>
                <input
                  placeholder="Tên danh mục (vd: Mứt Tết)"
                  value={newCatForm.name}
                  onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                  style={{
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <input
                  placeholder="Khu vực (vd: Đà Lạt) — không bắt buộc"
                  value={newCatForm.region}
                  onChange={(e) => setNewCatForm({ ...newCatForm, region: e.target.value })}
                  style={{
                    border: '1px solid #EAE1CC',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: C.inkSoft }}>Biểu tượng</span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    {CAT_ICON_OPTIONS.map((iconName) => {
                      const OptIcon = CAT_ICON_MAP[iconName];
                      const active = newCatForm.icon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewCatForm({ ...newCatForm, icon: iconName })}
                          title={iconName}
                          style={{
                            aspectRatio: '1 / 1',
                            borderRadius: 8,
                            border: `1.5px solid ${active ? C.night : '#EAE1CC'}`,
                            background: active ? `${C.night}12` : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <OptIcon size={16} color={active ? C.night : C.inkSoft} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: C.inkSoft }}>Màu sắc</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {CAT_COLOR_OPTIONS.map((color) => {
                      const active = newCatForm.color === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCatForm({ ...newCatForm, color })}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: color,
                            border: active ? `2.5px solid ${C.ink}` : '2px solid #fff',
                            boxShadow: active ? `0 0 0 1.5px ${color}` : '0 0 0 1px #EAE1CC',
                            cursor: 'pointer',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={savingCategory}
                  style={{
                    marginTop: 4,
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: savingCategory ? 'default' : 'pointer',
                    background: savingCategory ? '#EAE1CC' : C.night,
                    color: savingCategory ? C.inkSoft : '#fff',
                  }}
                >
                  {savingCategory ? 'Đang lưu...' : '+ Tạo danh mục'}
                </button>
              </div>

              {/* === DANH SÁCH DANH MỤC HIỆN CÓ === */}
              {categories.map((c) => {
                const CatIcon = CAT_ICON_MAP[c.icon] || Package;
                const isEditing = editingCatId === c.id;
                const productCount = products.filter((p) => p.cat === c.id).length;
                return (
                  <div
                    key={c.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #EAE1CC',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {!isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: `${c.color || catColor(c.id)}18`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CatIcon size={20} color={c.color || catColor(c.id)} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: C.inkSoft }}>
                            {productCount} sản phẩm{c.region ? ` · ${c.region}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEditCategory(c)}
                          style={{
                            border: '1px solid #EAE1CC',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <Pencil size={12} style={{ marginRight: 2 }} /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c)}
                          disabled={savingCategory}
                          title={productCount > 0 ? 'Còn sản phẩm dùng danh mục này' : 'Xoá danh mục'}
                          style={{
                            border: `1px solid ${productCount > 0 ? '#ddd' : C.brick + '55'}`,
                            borderRadius: 8,
                            padding: '6px 9px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: productCount > 0 ? '#999' : C.brick,
                            background: 'none',
                            cursor: productCount > 0 ? 'not-allowed' : 'pointer',
                            opacity: productCount > 0 ? 0.5 : 1,
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          value={editCatForm.name}
                          onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })}
                          style={{
                            border: '1px solid #EAE1CC',
                            borderRadius: 10,
                            padding: '10px 12px',
                            fontSize: 13,
                            outline: 'none',
                          }}
                        />
                        <input
                          placeholder="Khu vực"
                          value={editCatForm.region}
                          onChange={(e) => setEditCatForm({ ...editCatForm, region: e.target.value })}
                          style={{
                            border: '1px solid #EAE1CC',
                            borderRadius: 10,
                            padding: '10px 12px',
                            fontSize: 13,
                            outline: 'none',
                          }}
                        />
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(8, 1fr)',
                            gap: 6,
                          }}
                        >
                          {CAT_ICON_OPTIONS.map((iconName) => {
                            const OptIcon = CAT_ICON_MAP[iconName];
                            const active = editCatForm.icon === iconName;
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => setEditCatForm({ ...editCatForm, icon: iconName })}
                                title={iconName}
                                style={{
                                  aspectRatio: '1 / 1',
                                  borderRadius: 8,
                                  border: `1.5px solid ${active ? C.night : '#EAE1CC'}`,
                                  background: active ? `${C.night}12` : '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <OptIcon size={16} color={active ? C.night : C.inkSoft} />
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {CAT_COLOR_OPTIONS.map((color) => {
                            const active = editCatForm.color === color;
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setEditCatForm({ ...editCatForm, color })}
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: '50%',
                                  background: color,
                                  border: active ? `2.5px solid ${C.ink}` : '2px solid #fff',
                                  boxShadow: active ? `0 0 0 1.5px ${color}` : '0 0 0 1px #EAE1CC',
                                  cursor: 'pointer',
                                }}
                              />
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleSaveCategory(c.id)}
                            disabled={savingCategory}
                            style={{
                              flex: 1,
                              border: 'none',
                              borderRadius: 10,
                              padding: '9px 12px',
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: savingCategory ? 'default' : 'pointer',
                              background: savingCategory ? '#EAE1CC' : C.night,
                              color: savingCategory ? C.inkSoft : '#fff',
                            }}
                          >
                            {savingCategory ? 'Đang lưu...' : 'Lưu'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditCategory}
                            style={{
                              flex: 1,
                              border: '1px solid #EAE1CC',
                              borderRadius: 10,
                              padding: '9px 12px',
                              fontSize: 12.5,
                              fontWeight: 700,
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            Huỷ
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {adminTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: C.inkSoft }}>
                  <Package size={30} style={{ marginBottom: 10 }} />
                  <p>Chưa có đơn hàng nào</p>
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.firebaseId || o.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #EAE1CC',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                    >
                      <b style={{ fontSize: 13 }}>#{o.id}</b>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color:
                            o.status === 'Đã giao'
                              ? C.pine
                              : o.status === 'Đang giao'
                                ? C.dawn
                                : o.status === 'Đang đóng gói'
                                  ? '#B8860B'
                                  : o.status === 'Đã hủy'
                                    ? '#999'
                                    : C.brick,
                          background:
                            o.status === 'Đã giao'
                              ? `${C.pine}18`
                              : o.status === 'Đang giao'
                                ? `${C.dawn}18`
                                : o.status === 'Đang đóng gói'
                                  ? '#B8860B18'
                                  : o.status === 'Đã hủy'
                                    ? '#f5f5f5'
                                    : `${C.brick}18`,
                          padding: '2px 10px',
                          borderRadius: 999,
                        }}
                      >
                        {o.status}
                      </span>
                    </div>

                    {/* ===== PHẦN ĐÃ SỬA: ĐÃ THÊM TÊN KHÁCH HÀNG ===== */}
                    <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 6 }}>
                      {o.date} · {money(o.total)}
                      {o.items && (
                        <span style={{ marginLeft: 8 }}>
                          (
                          {o.items.reduce(
                            (sum, it) => sum + (typeof it === 'string' ? 1 : it.qty || 1),
                            0
                          )}{' '}
                          sản phẩm)
                        </span>
                      )}
                      {/* ✅ ĐÃ THÊM: Hiển thị tên khách hàng */}
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10.5,
                          background: C.night,
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: 999,
                          display: 'inline-block',
                        }}
                      >
                        👤 {o.customer?.name || 'Khách hàng'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* ✅ Nút Chi tiết có onClick mở modal */}
                      <button
                        onClick={() => {
                          setSelectedOrder(o);
                          setShowOrderDetail(true);
                        }}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.night,
                          background: 'none',
                          border: '1px solid #EAE1CC',
                          borderRadius: 8,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ClipboardList size={12} /> Chi tiết
                      </button>

                      {/* Các nút thao tác theo trạng thái */}
                      {o.status === 'Đang xử lý' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(o.firebaseId, 'Đang đóng gói')}
                            style={{ ...miniBtn, background: '#B8860B' }}
                          >
                            <Package size={12} style={{ marginRight: 4 }} /> Đóng gói
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                              if (reason !== null && reason.trim() !== '') {
                                updateOrderWithReason(o.firebaseId, 'Đã hủy', reason.trim());
                              } else if (reason !== null) {
                                alert('Vui lòng nhập lý do hủy đơn hàng!');
                              }
                            }}
                            style={{ ...miniBtn, background: C.brick }}
                          >
                            Hủy đơn
                          </button>
                        </>
                      )}

                      {o.status === 'Đang đóng gói' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(o.firebaseId, 'Đang giao')}
                            style={{ ...miniBtn, background: C.dawn }}
                          >
                            <Truck size={12} style={{ marginRight: 4 }} /> Đang giao
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                              if (reason !== null && reason.trim() !== '') {
                                updateOrderWithReason(o.firebaseId, 'Đã hủy', reason.trim());
                              } else if (reason !== null) {
                                alert('Vui lòng nhập lý do hủy đơn hàng!');
                              }
                            }}
                            style={{ ...miniBtn, background: C.brick }}
                          >
                            Hủy đơn
                          </button>
                        </>
                      )}

                      {o.status === 'Đang giao' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(o.firebaseId, 'Đã giao')}
                            style={{ ...miniBtn, background: C.pine }}
                          >
                            <Check size={12} style={{ marginRight: 4 }} /> Đã giao
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                              if (reason !== null && reason.trim() !== '') {
                                updateOrderWithReason(o.firebaseId, 'Đã hủy', reason.trim());
                              } else if (reason !== null) {
                                alert('Vui lòng nhập lý do hủy đơn hàng!');
                              }
                            }}
                            style={{ ...miniBtn, background: C.brick }}
                          >
                            Hủy đơn
                          </button>
                        </>
                      )}

                      {o.status === 'Đã hủy' && (
                        <button
                          onClick={() => updateOrderStatus(o.firebaseId, 'Đang xử lý')}
                          style={{ ...miniBtn, background: C.night }}
                        >
                          <RefreshCw size={12} style={{ marginRight: 4 }} /> Khôi phục
                        </button>
                      )}

                      {o.status === 'Đã giao' && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.pine,
                            padding: '6px 12px',
                            background: `${C.pine}12`,
                            borderRadius: 8,
                          }}
                        >
                          ✅ Hoàn tất
                        </span>
                      )}

                      {/* 🗑️ Xóa đơn hàng (dùng để dọn dữ liệu test/đơn bị trùng) */}
                      <button
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Xóa vĩnh viễn đơn hàng #${o.id}? Hành động này không thể hoàn tác.`
                            )
                          ) {
                            if (o.firebaseId) {
                              const ok = await deleteOrderFromFirebase(o.firebaseId);
                              if (ok) {
                                setOrders((prev) =>
                                  prev.filter((x) => x.firebaseId !== o.firebaseId)
                                );
                                showToast(`Đã xóa đơn hàng #${o.id}`);
                              } else {
                                showToast('❌ Xóa đơn hàng thất bại, vui lòng thử lại!');
                              }
                            }
                          }
                        }}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.brick,
                          background: 'none',
                          border: '1px solid #f5c6c6',
                          borderRadius: 8,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {adminTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {adminUsers.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.inkSoft,
                    textAlign: 'center',
                    padding: '20px 0',
                  }}
                >
                  Chưa có người dùng nào.
                </div>
              ) : (
                adminUsers.map((u) => {
                  const isSelf = u.firebaseId === currentUser.firebaseId;
                  const isBanned = u.status === 'banned';
                  return (
                    <div
                      key={u.firebaseId}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        alignItems: 'center',
                        background: '#fff',
                        border: `1px solid ${isBanned ? '#F5C6C0' : '#EAE1CC'}`,
                        borderRadius: 12,
                        padding: 10,
                        opacity: isBanned ? 0.7 : 1,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: u.role === 'admin' ? C.brick : C.night,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {(u.avatar || u.name?.charAt(0) || '?').toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {u.name}
                          {isSelf && (
                            <span style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 500 }}>(Bạn)</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.inkSoft }}>{u.email}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: '#fff',
                            background: u.role === 'admin' ? C.brick : C.pine,
                            padding: '3px 9px',
                            borderRadius: 999,
                          }}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Khách hàng'}
                        </span>
                        {isBanned && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: '#fff',
                              background: '#8B3A3A',
                              padding: '3px 9px',
                              borderRadius: 999,
                            }}
                          >
                            Đã khóa
                          </span>
                        )}
                        {!isSelf && (
                          <>
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.night,
                                background: '#F3EEE0',
                                border: '1px solid #EAE1CC',
                                borderRadius: 999,
                                padding: '4px 10px',
                                cursor: 'pointer',
                              }}
                              title={u.role === 'admin' ? 'Bỏ quyền Admin' : 'Cấp quyền Admin'}
                            >
                              {u.role === 'admin' ? 'Bỏ quyền Admin' : 'Cấp quyền Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleUserBan(u)}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: isBanned ? C.pine : C.brick,
                                background: isBanned ? '#EAF3EC' : '#FBEAE7',
                                border: `1px solid ${isBanned ? '#CFE6D6' : '#F5C6C0'}`,
                                borderRadius: 999,
                                padding: '4px 10px',
                                cursor: 'pointer',
                              }}
                              title={isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            >
                              {isBanned ? 'Mở khóa' : 'Khóa'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ===== TAB TIN NHẮN (ADMIN) — Chat 2 chiều real-time với từng khách hàng ===== */}
          {adminTab === 'messages' && (
            <div
              style={{
                position: 'relative',
                height: 520,
                background: '#fff',
                border: '1px solid #EAE1CC',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Cột trái: danh sách khách hàng đã nhắn tin — trượt sang trái khi mở 1 hội thoại */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflowY: 'auto',
                  background: '#fff',
                  transform: activeChatUserId ? 'translateX(-100%)' : 'translateX(0)',
                  transition: 'transform 0.28s ease',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '12px 12px 8px',
                    borderBottom: '1px solid #EAE1CC',
                    background: '#FCFAF4',
                    position: 'sticky',
                    top: 0,
                  }}
                >
                  💬 Khách hàng ({adminChats.filter((c) => !adminAccountIds.has(c.firebaseId)).length})
                </div>
                {adminChats.filter((c) => !adminAccountIds.has(c.firebaseId)).length === 0 ? (
                  <div style={{ fontSize: 12.5, color: C.inkSoft, textAlign: 'center', padding: 20 }}>
                    Chưa có khách hàng nào nhắn tin.
                  </div>
                ) : (
                  adminChats
                    .filter((c) => !adminAccountIds.has(c.firebaseId))
                    .map((c) => (
                    <div
                      key={c.firebaseId}
                      onClick={() => openAdminChat(c.firebaseId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F3EEE0',
                        background: activeChatUserId === c.firebaseId ? `${C.night}0D` : 'transparent',
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: C.night,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          flexShrink: 0,
                          fontSize: 14,
                        }}
                      >
                        {(c.customerName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{c.customerName || 'Khách hàng'}</span>
                          {c.unreadForAdmin > 0 && (
                            <span
                              style={{
                                background: C.brick,
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 999,
                                padding: '1px 6px',
                              }}
                            >
                              {c.unreadForAdmin}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.inkSoft,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: 2,
                          }}
                        >
                          {c.lastSender === 'admin' ? 'Bạn: ' : ''}
                          {c.lastMessage}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(c.firebaseId, c.customerName, e)}
                        title="Xóa hội thoại"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: C.inkSoft,
                          padding: 6,
                          flexShrink: 0,
                          display: 'flex',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Cột phải: hội thoại đang mở — trượt vào từ bên phải, choán toàn bộ khung như Messenger */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  background: '#fff',
                  transform: activeChatUserId ? 'translateX(0)' : 'translateX(100%)',
                  transition: 'transform 0.28s ease',
                }}
              >
                {activeChatUserId && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderBottom: '1px solid #EAE1CC',
                      }}
                    >
                      <button
                        onClick={() => setActiveChatUserId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          color: C.night,
                          flexShrink: 0,
                        }}
                        title="Quay lại danh sách"
                      >
                        <ArrowLeft size={19} />
                      </button>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: C.night,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          flexShrink: 0,
                          fontSize: 13,
                        }}
                      >
                        {(adminChats.find((c) => c.firebaseId === activeChatUserId)?.customerName || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {adminChats.find((c) => c.firebaseId === activeChatUserId)?.customerName ||
                            'Khách hàng'}
                        </div>
                        <div style={{ fontWeight: 400, fontSize: 11, color: C.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {adminChats.find((c) => c.firebaseId === activeChatUserId)?.customerEmail}
                        </div>
                      </div>
                      <button
                        onClick={(e) =>
                          handleDeleteConversation(
                            activeChatUserId,
                            adminChats.find((c) => c.firebaseId === activeChatUserId)?.customerName,
                            e
                          )
                        }
                        title="Xóa toàn bộ hội thoại"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: C.inkSoft,
                          padding: 4,
                          marginLeft: 'auto',
                          flexShrink: 0,
                          display: 'flex',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {activeChatMessages.length === 0 ? (
                        <div style={{ fontSize: 12.5, color: C.inkSoft, textAlign: 'center' }}>
                          Chưa có tin nhắn nào trong hội thoại này.
                        </div>
                      ) : (
                        activeChatMessages.map((m) => (
                          <div
                            key={m.firebaseId}
                            style={{
                              alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 4,
                                flexDirection: m.sender === 'admin' ? 'row-reverse' : 'row',
                              }}
                            >
                              <div
                                style={{
                                  background: m.sender === 'admin' ? C.night : '#F3EEE0',
                                  color: m.sender === 'admin' ? C.paper : C.ink,
                                  borderRadius: 12,
                                  padding: '8px 12px',
                                  fontSize: 13,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {m.text}
                              </div>
                              <button
                                onClick={() => handleDeleteAdminMessage(m.firebaseId)}
                                title="Xóa tin nhắn"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: C.inkSoft,
                                  padding: 4,
                                  flexShrink: 0,
                                  display: 'flex',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: C.inkSoft,
                                marginTop: 2,
                                textAlign: m.sender === 'admin' ? 'right' : 'left',
                              }}
                            >
                              {m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : ''}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        padding: 10,
                        borderTop: '1px solid #EAE1CC',
                      }}
                    >
                      <input
                        type="text"
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendAdminChatReply();
                        }}
                        placeholder="Nhập tin nhắn trả lời..."
                        style={{
                          flex: 1,
                          border: '1px solid #EAE1CC',
                          borderRadius: 10,
                          padding: '10px 12px',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={sendAdminChatReply}
                        disabled={!adminChatInput.trim()}
                        style={{
                          background: C.night,
                          color: C.paper,
                          border: 'none',
                          borderRadius: 10,
                          padding: '0 16px',
                          fontWeight: 700,
                          cursor: adminChatInput.trim() ? 'pointer' : 'not-allowed',
                          opacity: adminChatInput.trim() ? 1 : 0.5,
                        }}
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ===== TAB QUÀ TẶNG (ADMIN) ===== */}
          {adminTab === 'rewards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={openAddRewardForm}
                style={{
                  ...secondaryBtn,
                  borderStyle: 'dashed',
                  background: `${C.night}08`,
                  color: C.night,
                }}
              >
                <Plus size={16} style={{ marginRight: 6 }} /> Thêm quà / voucher mới
              </button>
              {rewardsList.length === 0 ? (
                <div
                  style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center', padding: '20px 0' }}
                >
                  Chưa có quà nào, hãy thêm quà đầu tiên!
                </div>
              ) : (
                rewardsList.map((r) => (
                  <div
                    key={r.firebaseId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#fff',
                      border: '1px solid #EAE1CC',
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontSize: 22 }}>
                      {r.discountType === 'freeship' ? '🚚' : r.discountType === 'gift' ? '🎁' : '🏷️'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                        {r.pointsCost} điểm
                        {r.discountType === 'fixed' && ` · Giảm ${money(r.discountValue)}`}
                      </div>
                    </div>
                    <button
                      onClick={() => openEditRewardForm(r)}
                      style={{
                        border: '1px solid #EAE1CC',
                        borderRadius: 8,
                        padding: '6px 10px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => removeReward(r)}
                      style={{
                        border: '1px solid #FADBD8',
                        borderRadius: 8,
                        padding: '6px 10px',
                        background: '#fff',
                        color: C.brick,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ===== TAB FLASH SALE (ADMIN) ===== */}
          {adminTab === 'flashsale' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={openAddFlashSaleForm}
                style={{
                  ...secondaryBtn,
                  borderStyle: 'dashed',
                  background: `${C.night}08`,
                  color: C.night,
                }}
              >
                <Plus size={16} style={{ marginRight: 6 }} /> Tạo chương trình giảm giá
              </button>
              {flashSales.length === 0 ? (
                <div
                  style={{ fontSize: 13, color: C.inkSoft, textAlign: 'center', padding: '20px 0' }}
                >
                  Chưa có chương trình giảm giá nào.
                </div>
              ) : (
                flashSales.map((s) => {
                  const active = isFlashSaleActive(s);
                  return (
                    <div
                      key={s.firebaseId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: '#fff',
                        border: '1px solid #EAE1CC',
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontSize: 22 }}>⚡</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {s.name}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#fff',
                              background: active ? C.pine : '#bbb',
                              padding: '2px 7px',
                              borderRadius: 999,
                            }}
                          >
                            {active ? 'Đang chạy' : 'Chưa/hết hiệu lực'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.inkSoft }}>
                          Giảm {s.discountPercent}% ·{' '}
                          {s.scope === 'all' ? 'Toàn bộ sản phẩm' : `Danh mục: ${s.categoryValue}`}
                        </div>
                        <div style={{ fontSize: 10.5, color: C.inkSoft }}>
                          {new Date(s.startDate).toLocaleString('vi-VN')} →{' '}
                          {new Date(s.endDate).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <button
                        onClick={() => openEditFlashSaleForm(s)}
                        style={{
                          border: '1px solid #EAE1CC',
                          borderRadius: 8,
                          padding: '6px 10px',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeFlashSale(s)}
                        style={{
                          border: '1px solid #FADBD8',
                          borderRadius: 8,
                          padding: '6px 10px',
                          background: '#fff',
                          color: C.brick,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ===== TAB THỐNG KÊ DOANH THU (ADMIN — Đợt 9) ===== */}
          {adminTab === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Pill active={statsPeriod === 'day'} onClick={() => setStatsPeriod('day')}>
                  7 ngày
                </Pill>
                <Pill active={statsPeriod === 'week'} onClick={() => setStatsPeriod('week')}>
                  8 tuần
                </Pill>
                <Pill active={statsPeriod === 'month'} onClick={() => setStatsPeriod('month')}>
                  6 tháng
                </Pill>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <StatCard
                  icon={Wallet}
                  label="Tổng doanh thu"
                  value={money(statsData.totalRevenue)}
                  color={C.pine}
                />
                <StatCard
                  icon={ClipboardList}
                  label="Tổng đơn hàng"
                  value={statsData.totalOrders}
                  color={C.night}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Giá trị TB / đơn"
                  value={money(statsData.avgOrderValue)}
                  color={C.dawn}
                />
                <StatCard
                  icon={Truck}
                  label="Đơn đã hủy"
                  value={statsData.cancelledCount}
                  color={C.brick}
                />
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart3 size={15} color={C.night} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Doanh thu theo{' '}
                    {statsPeriod === 'day' ? 'ngày' : statsPeriod === 'week' ? 'tuần' : 'tháng'}
                  </span>
                </div>
                {statsData.totalRevenue === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: C.inkSoft,
                      textAlign: 'center',
                      padding: '24px 0 10px',
                    }}
                  >
                    Chưa có doanh thu trong khoảng thời gian này
                  </p>
                ) : (
                  <RevenueBarChart buckets={statsData.buckets} />
                )}
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #EAE1CC',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy size={15} color={C.dawn} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Sản phẩm bán chạy nhất</span>
                </div>
                {statsData.topProducts.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: C.inkSoft,
                      textAlign: 'center',
                      padding: '10px 0',
                    }}
                  >
                    Chưa có dữ liệu bán hàng
                  </p>
                ) : (
                  statsData.topProducts.map((tp, idx) => {
                    const p = tp.product;
                    const Icon = iconFor(p?.cat);
                    return (
                      <div
                        key={tp.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            width: 18,
                            color: C.inkSoft,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: `${catColor(p?.cat)}18`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {p?.image ? (
                            <img
                              src={p.image}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Icon size={17} color={catColor(p?.cat)} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {p?.name || 'Sản phẩm đã bị xóa'}
                          </div>
                          <div style={{ fontSize: 11, color: C.inkSoft }}>
                            Đã bán {tp.qty} · {money(tp.revenue)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div style={{ height: 80 }} />
        </div>
      )}

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {showOrderDetail && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <button
              onClick={() => setShowOrderDetail(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            <h3
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Chi tiết đơn hàng #{selectedOrder.id}
            </h3>
            <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
              Ngày đặt: {selectedOrder.date}
            </div>

            {/* === PHẦN THÔNG TIN KHÁCH HÀNG === */}
            <div
              style={{
                background: `${C.night}08`,
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 8,
                  color: C.night,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <User size={16} /> Thông tin khách hàng
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: C.inkSoft }}>Họ tên:</span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedOrder.customer?.name || 'Khách hàng'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: C.inkSoft }}>Email:</span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedOrder.customer?.email || 'Chưa có'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: C.inkSoft }}>Số điện thoại:</span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedOrder.customer?.phone || 'Chưa có'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: C.inkSoft }}>Địa chỉ giao:</span>
                  <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                    {selectedOrder.customer?.address || 'Chưa có'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: C.inkSoft }}>Phương thức:</span>
                  <span style={{ fontWeight: 600 }}>{selectedOrder.payment || 'COD'}</span>
                </div>
              </div>
            </div>

            {/* Trạng thái + Timeline trực quan */}
            <OrderTimeline status={selectedOrder.status} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background:
                  selectedOrder.status === 'Đã giao'
                    ? `${C.pine}12`
                    : selectedOrder.status === 'Đang giao'
                      ? `${C.dawn}12`
                      : selectedOrder.status === 'Đang đóng gói'
                        ? '#B8860B12'
                        : selectedOrder.status === 'Đã hủy'
                          ? '#f5f5f5'
                          : `${C.brick}12`,
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>Trạng thái:</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    selectedOrder.status === 'Đã giao'
                      ? C.pine
                      : selectedOrder.status === 'Đang giao'
                        ? C.dawn
                        : selectedOrder.status === 'Đang đóng gói'
                          ? '#B8860B'
                          : selectedOrder.status === 'Đã hủy'
                            ? '#999'
                            : C.brick,
                }}
              >
                {selectedOrder.status}
              </span>
            </div>

            {/* Danh sách sản phẩm */}
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🛒 Sản phẩm:</div>
            <div
              style={{
                background: '#f8f8f8',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            >
              {selectedOrder.items &&
                selectedOrder.items.map((rawItem, index) => {
                  // Tương thích ngược: đơn cũ lưu items = ['id1','id2',...] (không có qty)
                  // đơn mới lưu items = [{ id, qty }, ...]
                  const itemId = typeof rawItem === 'string' ? rawItem : rawItem.id;
                  const qty = typeof rawItem === 'string' ? 1 : rawItem.qty || 1;
                  const product = products.find((p) => p.id === itemId);
                  const canReview = !isAdmin && selectedOrder.status === 'Đã giao' && product && currentUser;
                  const alreadyReviewed = reviewedKeysInOrder.has(`${selectedOrder.id}_${itemId}`);
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '6px 0',
                        borderBottom:
                          index < selectedOrder.items.length - 1 ? '1px solid #eee' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>
                          {product ? product.name : `Sản phẩm #${itemId} (đã bị xóa)`}
                          {qty > 1 && <span style={{ color: C.inkSoft }}> x{qty}</span>}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.brick }}>
                          {product ? money(product.price * qty) : 'N/A'}
                        </span>
                      </div>
                      {canReview && (
                        <div style={{ marginTop: 6, textAlign: 'right' }}>
                          {alreadyReviewed ? (
                            <span
                              style={{
                                fontSize: 11.5,
                                color: C.pine,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Check size={13} /> Đã đánh giá
                            </span>
                          ) : (
                            <button
                              onClick={() => openReviewModal(selectedOrder.id, itemId, product.name)}
                              style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: C.night,
                                background: `${C.dawn}22`,
                                border: 'none',
                                borderRadius: 999,
                                padding: '5px 12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Star size={12} /> Đánh giá sản phẩm
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Phí vận chuyển */}
            {selectedOrder.shippingFee != null && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontSize: 13,
                  color: C.inkSoft,
                }}
              >
                <span>
                  Phí vận chuyển{selectedOrder.shippingMethod ? ` (${selectedOrder.shippingMethod})` : ''}
                </span>
                <span>{money(selectedOrder.shippingFee)}</span>
              </div>
            )}

            {/* Tổng tiền */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderTop: '2px solid #EAE1CC',
                marginBottom: 16,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 16 }}>Tổng cộng:</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: C.brick }}>
                {money(selectedOrder.total)}
              </span>
            </div>

            {/* Ghi chú */}
            {selectedOrder.note && (
              <div
                style={{
                  padding: 10,
                  background: `${C.dawn}12`,
                  borderRadius: 8,
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontWeight: 700 }}>📝 Ghi chú:</span> {selectedOrder.note}
              </div>
            )}

            {/* Nút thao tác — CHỈ ADMIN mới được đổi trạng thái đơn hàng */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isAdmin && selectedOrder.status === 'Đang xử lý' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.firebaseId, 'Đang đóng gói')}
                    style={{ ...miniBtn, background: '#B8860B', flex: 1 }}
                  >
                    <Package size={14} style={{ marginRight: 4 }} /> Đóng gói
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                      if (reason !== null && reason.trim() !== '') {
                        updateOrderWithReason(selectedOrder.firebaseId, 'Đã hủy', reason.trim());
                      }
                    }}
                    style={{ ...miniBtn, background: C.brick, flex: 1 }}
                  >
                    Hủy đơn
                  </button>
                </>
              )}
              {isAdmin && selectedOrder.status === 'Đang đóng gói' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.firebaseId, 'Đang giao')}
                    style={{ ...miniBtn, background: C.dawn, flex: 1 }}
                  >
                    <Truck size={14} style={{ marginRight: 4 }} /> Đang giao
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                      if (reason !== null && reason.trim() !== '') {
                        updateOrderWithReason(selectedOrder.firebaseId, 'Đã hủy', reason.trim());
                      }
                    }}
                    style={{ ...miniBtn, background: C.brick, flex: 1 }}
                  >
                    Hủy đơn
                  </button>
                </>
              )}
              {isAdmin && selectedOrder.status === 'Đang giao' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.firebaseId, 'Đã giao')}
                    style={{ ...miniBtn, background: C.pine, flex: 1 }}
                  >
                    <Check size={14} style={{ marginRight: 4 }} /> Đã giao
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
                      if (reason !== null && reason.trim() !== '') {
                        updateOrderWithReason(selectedOrder.firebaseId, 'Đã hủy', reason.trim());
                      }
                    }}
                    style={{ ...miniBtn, background: C.brick, flex: 1 }}
                  >
                    Hủy đơn
                  </button>
                </>
              )}
              {isAdmin && selectedOrder.status === 'Đã hủy' && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.firebaseId, 'Đang xử lý')}
                  style={{ ...miniBtn, background: C.night, flex: 1 }}
                >
                  <RefreshCw size={14} style={{ marginRight: 4 }} /> Khôi phục
                </button>
              )}
              <button
                onClick={() => setShowOrderDetail(false)}
                style={{
                  ...miniBtn,
                  background: 'none',
                  color: C.ink,
                  border: '1px solid #EAE1CC',
                  flex: 1,
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL ĐÁNH GIÁ SẢN PHẨM (sau khi đơn hàng đã được giao) ===== */}
      {showReviewModal && reviewTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 380 }}>
            <button
              onClick={() => setShowReviewModal(false)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                color: C.inkSoft,
              }}
            >
              ✕
            </button>
            <h2
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Đánh giá sản phẩm
            </h2>
            <p style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>{reviewTarget.productName}</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Số sao
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setReviewStars(n)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  >
                    <Star
                      size={26}
                      fill={n <= reviewStars ? C.dawn : 'none'}
                      color={n <= reviewStars ? C.dawn : C.inkSoft}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Nhận xét (không bắt buộc)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                style={{
                  width: '100%',
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>

            <button
              onClick={submitReview}
              disabled={isSubmittingReview}
              style={{
                ...primaryBtn,
                opacity: isSubmittingReview ? 0.6 : 1,
                cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL LIÊN HỆ ADMIN - THÊM VÀO ĐÂY ===== */}
      {showContact && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: 420,
              height: 560,
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: '1px solid #EAE1CC',
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 17,
                    fontWeight: 600,
                  }}
                >
                  💬 Chat với Admin
                </h3>
                <p style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
                  Nhắn tin trực tiếp — Admin sẽ phản hồi ngay tại đây.
                </p>
              </div>
              <button
                onClick={() => setShowContact(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Khung tin nhắn */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: '#FCFAF4',
              }}
            >
              {chatMessages.length === 0 ? (
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.inkSoft,
                    textAlign: 'center',
                    marginTop: 20,
                  }}
                >
                  Chưa có tin nhắn nào. Hãy gửi câu hỏi đầu tiên của bạn cho Admin!
                  <div style={{ marginTop: 10, fontSize: 11.5 }}>
                    📞 0987.654.321 · 8:00 - 21:00 (T2 - T7)
                  </div>
                </div>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.firebaseId}
                    style={{
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 4,
                        flexDirection: m.sender === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <div
                        style={{
                          background: m.sender === 'user' ? C.night : '#F3EEE0',
                          color: m.sender === 'user' ? C.paper : C.ink,
                          borderRadius: 12,
                          padding: '8px 12px',
                          fontSize: 13,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.text}
                      </div>
                      {m.sender === 'user' && (
                        <button
                          onClick={() => handleDeleteMyMessage(m.firebaseId)}
                          title="Xóa tin nhắn"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: C.inkSoft,
                            padding: 4,
                            flexShrink: 0,
                            display: 'flex',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: C.inkSoft,
                        marginTop: 2,
                        textAlign: m.sender === 'user' ? 'right' : 'left',
                      }}
                    >
                      {m.sender === 'admin' ? 'Admin · ' : ''}
                      {m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : ''}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ô nhập tin nhắn */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: 12,
                borderTop: '1px solid #EAE1CC',
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMyChatMessage();
                }}
                placeholder="Nhập tin nhắn..."
                style={{
                  flex: 1,
                  border: '1px solid #EAE1CC',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={sendMyChatMessage}
                disabled={!chatInput.trim()}
                style={{
                  background: C.night,
                  color: C.paper,
                  border: 'none',
                  borderRadius: 10,
                  padding: '0 16px',
                  fontWeight: 700,
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: chatInput.trim() ? 1 : 0.5,
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BOTTOM NAV */}
      {!['detail', 'checkout'].includes(view) && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 480,
            background: '#fff',
            borderTop: '1px solid #EAE1CC',
            display: 'flex',
            padding: '8px 6px',
            zIndex: 40,
          }}
        >
          {[
            { id: 'home', label: 'Trang chủ', icon: Home },
            { id: 'search', label: 'Tìm kiếm', icon: Search },
            { id: 'map', label: 'Bản đồ', icon: MapPin },
            { id: 'cart', label: 'Giỏ hàng', icon: ShoppingCart },
            { id: 'account', label: 'Tài khoản', icon: currentUser ? User : LogIn },
          ].map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if ((n.id === 'cart' || n.id === 'account') && !currentUser) {
                  setShowLogin(true);
                  return;
                }
                if (n.id === 'cart') {
                  setCheckoutStep(1);
                }
                setView(n.id);
              }}
              style={{
                flex: 1,
                background: view === n.id ? C.night : 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '4px 0',
                borderRadius: 8,
                color: view === n.id ? C.paper : C.inkSoft,
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <n.icon size={18} strokeWidth={view === n.id ? 2.4 : 2} />
              <span style={{ fontSize: 9, fontWeight: view === n.id ? 700 : 500 }}>{n.label}</span>
              {n.id === 'cart' && cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: 'calc(50% - 30px)',
                    background: C.brick,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 999,
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 78,
            left: '50%',
            transform: 'translateX(-50%)',
            background: C.ink,
            color: '#fff',
            padding: '9px 16px',
            borderRadius: 999,
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 50,
            maxWidth: '90%',
          }}
        >
          <Check size={14} color={C.dawn} /> {toast}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, sub, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 16.5 }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 11, color: '#5C6660' }}>{sub}</div>}
      </div>
      {action && (
        <span
          onClick={onAction}
          style={{ fontSize: 11.5, fontWeight: 700, color: '#A5432B', cursor: 'pointer' }}
        >
          {action}
        </span>
      )}
    </div>
  );
}

function EmptyState({ text, cta, onCta }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px' }}>
      <Package size={30} color="#5C6660" style={{ marginBottom: 10 }} />
      <p style={{ fontSize: 13, color: '#5C6660', marginBottom: cta ? 14 : 0 }}>{text}</p>
      {cta && (
        <button
          onClick={onCta}
          style={{ ...primaryBtn, position: 'static', width: 'auto', padding: '10px 20px' }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function Steps({ step }) {
  const labels = ['Địa chỉ', 'Thanh toán', 'Xác nhận', 'Hoàn tất'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                margin: '0 auto 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                background: step > i ? C.pine : step === i + 1 ? C.night : '#EAE1CC',
                color: step >= i + 1 ? '#fff' : C.inkSoft,
              }}
            >
              {step > i + 1 ? <Check size={14} /> : i + 1}
            </div>
            <div style={{ fontSize: 9, color: C.inkSoft }}>{l}</div>
          </div>
          {i < labels.length - 1 && (
            <div
              style={{
                height: 2,
                flex: 0.5,
                background: step > i + 1 ? C.pine : '#EAE1CC',
                marginBottom: 18,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '5px 0',
        fontWeight: bold ? 700 : 400,
        fontSize: bold ? 13.5 : 12.5,
      }}
    >
      <span style={{ color: bold ? C.ink : C.inkSoft }}>{label}</span>
      <span style={{ textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

const iconBtn = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid #EAE1CC',
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
const selectStyle = {
  flex: 1,
  border: '1px solid #EAE1CC',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 12.5,
  background: '#fff',
};
const pageTitle = {
  fontFamily: "'Fraunces',serif",
  fontWeight: 600,
  fontSize: 20,
  margin: '10px 0 14px',
};
const primaryBtn = {
  position: 'static',
  width: '100%',
  marginTop: 18,
  background: C.night,
  color: C.paper,
  border: 'none',
  borderRadius: 12,
  padding: 13,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};
const secondaryBtn = {
  width: '100%',
  background: '#fff',
  border: '1px solid #EAE1CC',
  borderRadius: 12,
  padding: 12,
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};
const qtyBtn = {
  width: 28,
  height: 28,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const miniBtn = {
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  background: C.night,
  border: 'none',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
};
