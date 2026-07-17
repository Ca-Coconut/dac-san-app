// Xin quyền Vị trí và Bộ nhớ/Ảnh khi chạy trên app Android thật (đóng gói bằng Capacitor).
// Khi chạy trên trình duyệt (npm run dev / npm run preview), các hàm này tự bỏ qua phần
// native và không báo lỗi, để không ảnh hưởng lúc bạn code/test trên máy tính.

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem } from '@capacitor/filesystem';

export const isNativeApp = () => Capacitor.isNativePlatform();

// Xin quyền vị trí (Location). Trả về 'granted' | 'denied' | 'prompt' | 'unavailable'.
// Đây là quyền "nguy hiểm" của Android nên hệ thống sẽ tự hiện hộp thoại xin phép thật,
// không phải hộp thoại tự vẽ trong web — chỉ cần gọi đúng hàm plugin này là Android lo phần còn lại.
export const requestLocationPermission = async () => {
  if (!isNativeApp()) return 'unavailable';
  try {
    const status = await Geolocation.requestPermissions();
    return status.location;
  } catch (err) {
    console.log('Lỗi xin quyền vị trí:', err);
    return 'denied';
  }
};

// Xin quyền bộ nhớ / ảnh (Storage) — cần khi người dùng chọn ảnh đại diện, ảnh sản phẩm...
// Trên Android 13+ hệ thống dùng "Photo Picker" nên nhiều máy sẽ không cần hộp thoại này,
// nhưng gọi vẫn an toàn và giúp các máy Android cũ hơn xin quyền đúng chuẩn.
export const requestStoragePermission = async () => {
  if (!isNativeApp()) return 'unavailable';
  try {
    const status = await Filesystem.requestPermissions();
    return status.publicStorage;
  } catch (err) {
    console.log('Lỗi xin quyền bộ nhớ:', err);
    return 'denied';
  }
};

// Lấy vị trí hiện tại. Trên app thật dùng plugin native (xin quyền đúng chuẩn Android trước
// khi lấy vị trí). Trên trình duyệt (lúc code/test) dùng navigator.geolocation như bình thường.
export const getCurrentLocation = async () => {
  try {
    if (isNativeApp()) {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 15000,
      });
      return `${pos.coords.latitude},${pos.coords.longitude}`;
    }
    return await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ định vị'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(`${position.coords.latitude},${position.coords.longitude}`),
        (error) => reject(error),
        { enableHighAccuracy: false, timeout: 15000 }
      );
    });
  } catch (err) {
    console.log('Lỗi lấy vị trí:', err);
    // Trả về null nhưng kèm lý do lỗi thật (message + code) để hiển thị cho người dùng,
    // thay vì chỉ im lặng hiện "Đang tìm vị trí..." mãi mãi mà không rõ vì sao.
    return { error: true, message: err?.message || 'unknown', code: err?.code };
  }
};
