export type RoomStatus = "available" | "occupied" | "reserved";

export type Room = {
    id: string;
    label: string;
    status: RoomStatus;
    price?: number;
    time?: string;
    customers?: number;
    floor: string;
    isGolf?: boolean;
    golfData?: any;
};

export type Product = {
    id: number;
    name: string;
    price: number;
    category_id?: number;
    category_name?: string;
};

export type OrderItem = {
    uniqueId: string;
    product: Product;
    quantity: number;
    sentQuantity?: number;
    kitchenStatus?: 'pending' | 'done';
    sentTime?: string;
};
