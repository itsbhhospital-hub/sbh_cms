import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Save, User, Shield, Phone, Building2, Clock, Globe, Lock, CheckCircle, AlertTriangle, Key, Trash2 } from 'lucide-react';
import { sheetsService } from '../services/googleSheets';
import { useAuth } from '../context/AuthContext';
import ImageCropper from './ImageCropper';
import SuccessPopup from './SuccessPopup';

const UserProfilePanel = ({ user: targetUser, onClose, onUpdate, onDelete }) => {
    const { user: currentUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);

    // Form and UI State
    const [formData, setFormData] = useState({
        Username: '',
        Department: '',
        Mobile: '',
        Role: '',
        Password: '',
        LastLogin: new Date().toISOString(),
        IPDetails: '192.168.1.1',
        ProfilePhoto: null,
        OldUsername: ''
    });

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const fileInputRef = useRef(null);

    // Crop & Upload State
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (targetUser) {
            setFormData({
                ...targetUser,
                Username: targetUser.Username || '',
                Department: targetUser.Department || '',
                Mobile: targetUser.Mobile || '',
                Role: targetUser.Role || '',
                Password: targetUser.Password || '',
                LastLogin: targetUser.LastLogin || new Date().toISOString(),
                IPDetails: targetUser.IPDetails || '192.168.1.1',
                ProfilePhoto: targetUser.ProfilePhoto || null,
                OldUsername: targetUser.Username // Track original
            });
            // Reset pending file on new user view
            setPendingFile(null);
            setTempImage(null);
        }
    }, [targetUser]);

    const [error, setError] = useState('');

    const handleSave = async () => {
        // Only set loader for the main user data update, image is now silent in background
        setError('');
        try {
            // 1. Upload Pending Image (if any)
            let finalPhotoUrl = formData.ProfilePhoto;

            if (pendingFile) {
                // Upload to Drive & Get URL (NOW SILENT in sheetsService)
                const result = await sheetsService.uploadProfileImage(pendingFile, formData.Username);
                if (result.status === 'success') {
                    finalPhotoUrl = result.data.url;
                } else {
                    throw new Error("Image Upload Failed: " + result.message);
                }
            }

            // 2. Commit All Changes (including new Photo URL)
            setLoading(true); // START LOADER ONLY FOR FINAL DATA COMMIT
            const updatedData = { ...formData, ProfilePhoto: finalPhotoUrl };
            await onUpdate(updatedData);

            setSuccessMsg("Profile updated successfully");
            setIsEditing(false);
            setPendingFile(null); // Clear pending
        } catch (err) {
            console.error("Update failed", err);
            const msg = err.message || "Update failed";
            if (msg.includes("CRITICAL SECURE")) {
                setError("Security Restricted: The System Master account cannot be modified via the app.");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation (Max 2MB for crop allow, then we can compress)
        // User asked for 300KB limit on upload. Cropper produces blob.
        if (file.size > 5 * 1024 * 1024) {
            alert("Image too large! Please pick under 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setTempImage(reader.result);
            setShowCropper(true);
            e.target.value = null; // Reset input
        });
        reader.readAsDataURL(file);
    };

    const handleCropSave = (croppedBlob) => {
        // Create a fake URL for preview
        const previewUrl = URL.createObjectURL(croppedBlob);

        setFormData(prev => ({ ...prev, ProfilePhoto: previewUrl }));
        setPendingFile(croppedBlob); // Store for later upload
        setShowCropper(false);
    };

    if (!targetUser) return null;

    const isMe = currentUser.Username === targetUser.Username;
    const isAdmin = currentUser.Role === 'admin' || currentUser.Role === 'SUPER_ADMIN';
    const canEdit = isAdmin || isMe;

    return (
        <>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-[150] flex flex-col border-l border-slate-200"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">User Profile</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">System Registry Details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                    {/* Profile Identity Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white ring-1 ring-slate-200 relative">
                                {formData.ProfilePhoto ? (
                                    <img src={formData.ProfilePhoto} alt="Profile" className="w-full h-full object-cover object-center" />
                                ) : (
                                    <User size={48} className="text-slate-300" />
                                )}

                                {/* Overlay only when editing */}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <Camera className="text-white drop-shadow-md" />
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-1 right-1 p-2 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 transition-all z-10"
                                    title="Change Photo"
                                >
                                    <Camera size={18} />
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png" onChange={handleFileChange} />
                        </div>

                        <div className="mt-4 text-center">
                            <h3 className="text-xl font-black text-slate-800">{formData.Username}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase mt-2 ${formData.Status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                {formData.Status === 'Active' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                {formData.Status}
                            </span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3"
                        >
                            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-rose-700 leading-relaxed">{error}</p>
                        </motion.div>
                    )}

                    {/* Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['personal', 'system', 'security'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === tab ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Panels */}
                    <div className="space-y-6">
                        {activeTab === 'personal' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <InputField
                                    label="Full Name / Username"
                                    value={formData.Username}
                                    onChange={v => setFormData({ ...formData, Username: v })}
                                    icon={User}
                                    editable={isEditing && isAdmin} // Only Admin can change Username/ID
                                />
                                <InputField
                                    label="Department"
                                    value={formData.Department}
                                    onChange={v => setFormData({ ...formData, Department: v })}
                                    icon={Building2}
                                    editable={isEditing && isAdmin} // Only Admin can change Dept
                                />
                                <InputField
                                    label="Mobile Number"
                                    value={formData.Mobile}
                                    onChange={v => setFormData({ ...formData, Mobile: v })}
                                    icon={Phone}
                                    editable={isEditing} // Users can edit mobile
                                />
                            </motion.div>
                        )}

                        {activeTab === 'system' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                                {/* Role Dropdown (Admin Only) */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block ml-1">User Access Role</label>
                                    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isEditing && isAdmin ? 'bg-white border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                                        <Shield size={18} className={isEditing && isAdmin ? 'text-orange-500' : 'text-slate-400'} />
                                        <select
                                            value={formData.Role}
                                            onChange={e => setFormData({ ...formData, Role: e.target.value })}
                                            disabled={!isEditing || !isAdmin}
                                            className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 disabled:text-slate-500 appearance-none"
                                        >
                                            <option value="user">User</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        {isEditing && isAdmin && <div className="text-[10px] font-bold text-orange-400 uppercase">Edit</div>}
                                    </div>
                                </div>

                                {/* System Information Section */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">System Information</h4>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><Clock size={16} /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">Last Login</p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {new Date(formData.LastLogin).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 text-purple-500 rounded-lg"><Globe size={16} /></div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">Network IP</p>
                                                <p className="text-xs font-bold text-slate-700">{formData.IPDetails}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-4">
                                    <h4 className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-2">
                                        <AlertTriangle size={16} /> Security Settings
                                    </h4>
                                    <p className="text-xs text-rose-600/80 leading-relaxed">
                                        Update your password here. If you are an admin editing another user, this will reset their password.
                                    </p>
                                </div>
                                <InputField
                                    label="Login Password"
                                    value={formData.Password}
                                    onChange={v => setFormData({ ...formData, Password: v })}
                                    icon={Key}
                                    type="text"
                                    editable={isEditing} // Users can change password
                                />
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                {canEdit && (
                    <div className="p-6 border-t border-slate-100 bg-white md:bg-slate-50">
                        {isEditing ? (
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                                    {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                {isAdmin && !isMe && (
                                    <button onClick={onDelete} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 border border-rose-100 transition-colors">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                    <User size={18} /> Edit Profile
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Cropper Modal */}
            {showCropper && tempImage && (
                <ImageCropper
                    image={tempImage}
                    onCropComplete={handleCropSave}
                    onClose={() => setShowCropper(false)}
                />
            )}

            {/* Success Popup */}
            <SuccessPopup message={successMsg} onClose={() => setSuccessMsg('')} />
        </>
    );
};

const InputField = ({ label, value, onChange, icon: Icon, type = "text", editable }) => (
    <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block ml-1">{label}</label>
        <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${editable ? 'bg-white border-orange-200 shadow-sm ring-2 ring-orange-500/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <Icon size={18} className={editable ? 'text-orange-500' : 'text-slate-400'} />
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={!editable}
                className="bg-transparent outline-none w-full text-sm font-bold text-slate-700 disabled:text-slate-500"
            />
            {editable && <div className="text-[10px] font-bold text-orange-400 uppercase">Edit</div>}
        </div>
    </div>
);

export default UserProfilePanel;
