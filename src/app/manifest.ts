import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Quản Lý Chi Tiêu',
        short_name: 'Chi Tiêu',
        description: 'Ứng dụng quản lý chi tiêu nhóm cá nhân',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#6366f1',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    };
}
