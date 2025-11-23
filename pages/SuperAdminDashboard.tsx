
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { UserRole, Tenant } from '../types';
import { getAllTenants, createTenant, updateTenantStatus } from '../services/mockDb';
import { Building, Plus, Lock, Unlock, Calendar } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPass, setNewPass] = useState('admin123');

    useEffect(() => {
        getAllTenants().then(setTenants);
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createTenant(newName, newPhone, newPass);
        if (res.success) {
            setShowModal(false);
            getAllTenants().then(setTenants);
            setNewName(''); setNewPhone('');
            alert('Tạo thương hiệu thành công!');
        } else {
            alert('Lỗi: ' + res.message);
        }
    };

    const toggleStatus = async (t: Tenant) => {
        const newStatus = t.status === 'active' ? 'locked' : 'active';
        if(confirm(`Bạn có chắc muốn ${newStatus === 'locked' ? 'KHÓA' : 'MỞ'} thương hiệu này?`)) {
            await updateTenantStatus(t.id, newStatus);
            getAllTenants().then(setTenants);
        }
    };

    return (
        <Layout role={UserRole.SUPER_ADMIN} title="Quản Lý Hệ Thống">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Danh sách Thương hiệu ({tenants.length})</h2>
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-brand-600 text-white rounded-lg flex items-center shadow">
                    <Plus size={18} className="mr-2"/> Tạo Thương Hiệu Mới
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenants.map(t => (
                    <div key={t.id} className={`p-4 rounded-xl border shadow-sm ${t.status === 'active' ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mr-3">
                                    <Building size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{t.name}</h3>
                                    <p className="text-xs text-gray-500">ID: {t.id}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {t.status.toUpperCase()}
                            </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                                <Calendar size={14} className="mr-2"/>
                                <span>Hạn sử dụng: {new Date(t.subscription_end).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar size={14} className="mr-2"/>
                                <span>Ngày tạo: {new Date(t.created_at).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>

                        <div className="flex justify-end border-t pt-3 space-x-2">
                            <button 
                                onClick={() => toggleStatus(t)}
                                className={`flex items-center px-3 py-1 rounded text-sm font-bold ${t.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            >
                                {t.status === 'active' ? <><Lock size={14} className="mr-1"/> Khóa</> : <><Unlock size={14} className="mr-1"/> Mở Khóa</>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">Đăng ký Thương hiệu mới</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold">Tên Thương hiệu</label>
                                <input type="text" className="w-full p-2 border rounded" value={newName} onChange={e => setNewName(e.target.value)} placeholder="VD: Gym ABC" required />
                            </div>
                            <div>
                                <label className="text-sm font-bold">SĐT Chủ sở hữu (Admin)</label>
                                <input type="text" className="w-full p-2 border rounded" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="09xxxx" required />
                            </div>
                            <div>
                                <label className="text-sm font-bold">Mật khẩu mặc định</label>
                                <input type="text" className="w-full p-2 border rounded" value={newPass} onChange={e => setNewPass(e.target.value)} />
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded font-bold">Tạo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SuperAdminDashboard;
