// app/libs/i18nProvider.ts
const customI18nProvider = {
    translate: (key: string, options?: any) => {
        const translations: Record<string, string> = {
            "buttons.create": "Tạo mới",
            "buttons.edit": "Chỉnh sửa",
            "buttons.delete": "Xóa",
            "buttons.confirm": "Bạn có chắc chắn xóa không?",
            "buttons.save": "Lưu",
            "buttons.cancel": "Hủy",
            "buttons.show": "Xem",
            "buttons.list": "Danh sách",
            "buttons.refresh": "Làm mới",
            "buttons.logout": "Đăng xuất",
            "buttons.clone": "Nhân bản",
            "actions.create": "Tạo mới",
            "actions.edit": "Chỉnh sửa",
            "actions.delete": "Xóa",



            // Notifications
            "notifications.success": "Thao tác thành công",
            "notifications.error": "Đã xảy ra lỗi",
            "notifications.createSuccess": "Tạo mới thành công",
            "notifications.editSuccess": "Cập nhật thành công",
            "notifications.deleteSuccess": "Xóa thành công",
            "notifications.undoable": "Bạn có {{seconds}} giây để hoàn tác",


            "products.titles.list": "Sản phẩm",
            "categories.titles.list": "Danh mục",

            

        };
        return translations[key] ?? options?.defaultValue ?? key;
    },
    changeLocale: async () => {},
    getLocale: () => "vi",
};

export default customI18nProvider;