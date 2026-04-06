// RefineProvider.tsx
import {
    ShoppingOutlined,
    AppstoreOutlined,
    ShoppingCartOutlined,
    BgColorsOutlined,
} from "@ant-design/icons";

resources = {
    [
    {
        name: "products",
        list: "/products",
        create: "/products/create",
        edit: "/products/edit/:id",
        show: "/products/show/:id",
        meta: {
            label: "Sản phẩm",
            canDelete: true,
            icon: <ShoppingOutlined />,
        },
    },
    {
        name: "categories",
        list: "/categories",
        create: "/categories/create",
        edit: "/categories/edit/:id",
        show: "/categories/show/:id",
        meta: {
            label: "Danh mục",
            canDelete: true,
            icon: <AppstoreOutlined />,
        },
    },
    {
        name: "orders",
        list: "/orders",
        create: "/orders/create",
        edit: "/orders/edit/:id",
        show: "/orders/show/:id",
        meta: {
            label: "Đơn hàng",
            canDelete: true,
            icon: <ShoppingCartOutlined />,
        },
    },
    {
        name: "colors",
        list: "/colors",
        create: "/colors/create",
        edit: "/colors/edit/:id",
        show: "/colors/show/:id",
        meta: {
            label: "Màu sắc",
            canDelete: true,
            icon: <BgColorsOutlined />,
        },
    },
]}