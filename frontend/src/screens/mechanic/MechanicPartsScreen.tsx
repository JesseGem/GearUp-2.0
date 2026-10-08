import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Image, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { partsService } from '../../services/partsService';
import { userService } from '../../services/userService';
import { messageService } from '../../services/messageService';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AppAlertCard } from '../../components/AppAlert';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';

const ACCENT = '#000814';
const ACCENT_DEEP = '#001D3D';
const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'];
const CATEGORIES = ['Engine', 'Battery', 'Tires', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Other'];
const emptyForm = {
  name: '', description: '', price: '', brand: '',
  carMake: '', carModel: '', condition: 'New', category: 'Engine',
  imageUrl: '' as string | null,
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return '#10b981';
    case 'SOLD': return '#6b7280';
    case 'RESERVED': return '#f59e0b';
    default: return '#6b7280';
  }
};
const getOrderStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING': return '#f59e0b';
    case 'ACCEPTED': return '#3b82f6';
    case 'DECLINED': return '#ef4444';
    case 'CANCELLED': return '#ef4444';
    case 'COMPLETED': return '#10b981';
    default: return '#6b7280';
  }
};

// ─── PartCard: its own component so entrance-animation hooks are safe/stable ───
function PartCard({ part, index, onOpenEdit, onOpenBuyers, onMarkSold, onDelete }: {
  part: any;
  index: number;
  onOpenEdit: () => void;
  onOpenBuyers: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index * 50, 300),
      useNativeDriver: true,
    }).start();
  }, []);
  const animatedStyle = {
    opacity: cardAnim,
    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity style={styles.partCard} activeOpacity={0.85} onPress={onOpenEdit}>
        <View style={styles.partCardRow}>
          {part.imageUrl ? (
            <Image source={{ uri: part.imageUrl }} style={styles.partThumb} />
          ) : (
            <View style={styles.partThumbPlaceholder}>
              <Ionicons name="image-outline" size={24} color="#d1d5db" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.partHeader}>
              <Text style={styles.partName} numberOfLines={1}>{part.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(part.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(part.status) }]}>{part.status}</Text>
              </View>
            </View>
            <Text style={styles.partDesc} numberOfLines={2}>{part.description}</Text>
            <Text style={styles.partPrice}>GHS {part.price}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
        <View style={styles.partMeta}>
          {part.brand && <Text style={styles.metaChip}>{part.brand}</Text>}
          {part.carMake && <Text style={styles.metaChip}>{part.carMake} {part.carModel}</Text>}
          {part.condition && <Text style={styles.metaChip}>{part.condition}</Text>}
        </View>
        <View style={styles.actions}>
          {part.status !== 'SOLD' && (
            <TouchableOpacity style={styles.buyersBtn} onPress={(e) => { e.stopPropagation(); onOpenBuyers(); }}>
              <Ionicons name="people-outline" size={14} color="#2563eb" />
              <Text style={styles.buyersBtnText}>Buyers</Text>
            </TouchableOpacity>
          )}
          {part.status === 'AVAILABLE' && (
            <TouchableOpacity style={styles.editBtn} onPress={(e) => { e.stopPropagation(); onOpenEdit(); }}>
              <Ionicons name="pencil-outline" size={14} color={ACCENT} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
          {part.status !== 'SOLD' && (
            <TouchableOpacity style={styles.soldBtn} onPress={(e) => { e.stopPropagation(); onMarkSold(); }}>
              <Text style={styles.soldBtnText}>Mark Sold</Text>
            </TouchableOpacity>
          )}
          {part.status === 'AVAILABLE' && (
            <TouchableOpacity style={styles.deleteBtn} onPress={(e) => { e.stopPropagation(); onDelete(); }}>
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MechanicPartsScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [soldConfirm, setSoldConfirm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [buyersModalPart, setBuyersModalPart] = useState<any>(null);
  const [buyerOrders, setBuyerOrders] = useState<any[]>([]);
  const [buyerProfiles, setBuyerProfiles] = useState<Record<number, any>>({});
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [messagingBuyerId, setMessagingBuyerId] = useState<number | null>(null);
  const enterAnim = useRef(new Animated.Value(0)).current;

  const fetchParts = async () => {
    try {
      const data = await partsService.getMyListings();
      setParts(data);
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchParts();
    Animated.timing(enterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);
  const onRefresh = () => { setRefreshing(true); fetchParts(); };

  const openAddModal = () => {
    setEditingPartId(null);
    setForm(emptyForm);
    setLocalImageUri(null);
    setModalVisible(true);
  };
  const openEditModal = (part: any) => {
    setEditingPartId(part.id);
    setForm({
      name: part.name || '',
      description: part.description || '',
      price: part.price ? String(part.price) : '',
      brand: part.brand || '',
      carMake: part.carMake || '',
      carModel: part.carModel || '',
      condition: part.condition || 'New',
      category: 'Engine',
      imageUrl: part.imageUrl || '',
    });
    setLocalImageUri(part.imageUrl || null);
    setModalVisible(true);
  };
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAlert({ type: 'warning', title: 'Permission needed', message: 'Please allow photo access to add a picture of this part.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setLocalImageUri(uri);
    setUploadingImage(true);
    try {
      const imageUrl = await partsService.uploadImage(uri);
      setForm(prev => ({ ...prev, imageUrl }));
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Upload Failed', message: e.message || 'Could not upload image. Please try again.' });
      setLocalImageUri(form.imageUrl || null);
    } finally {
      setUploadingImage(false);
    }
  };
  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.price) {
      setAlert({ type: 'warning', title: 'Missing Information', message: 'Name, description and price are required.' });
      return;
    }
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      brand: form.brand,
      carMake: form.carMake,
      carModel: form.carModel,
      condition: form.condition,
      imageUrl: form.imageUrl || undefined,
    };
    try {
      if (editingPartId) {
        await partsService.updateListing(editingPartId, payload);
        setAlert({ type: 'success', title: 'Success', message: 'Listing updated!' });
      } else {
        await partsService.createListing(payload as any);
        setAlert({ type: 'success', title: 'Success', message: 'Part listed successfully!' });
      }
      setModalVisible(false);
      setForm(emptyForm);
      setLocalImageUri(null);
      setEditingPartId(null);
      fetchParts();
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    }
  };
  const confirmMarkSold = async () => {
    const part = soldConfirm;
    setSoldConfirm(null);
    if (!part) return;
    try {
      await partsService.markAsSold(part.id);
      fetchParts();
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    }
  };
  const confirmDeleteListing = async () => {
    const part = deleteConfirm;
    setDeleteConfirm(null);
    if (!part) return;
    try {
      await partsService.deleteListing(part.id);
      fetchParts();
    } catch (error: any) {
      setAlert({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const openBuyersModal = async (part: any) => {
    setBuyersModalPart(part);
    setLoadingBuyers(true);
    try {
      const orders = await partsService.getOrdersForPart(part.id);
      setBuyerOrders(orders);
      const missingIds = Array.from(new Set(orders.map((o: any) => o.buyerId))).filter(id => !buyerProfiles[id as number]);
      if (missingIds.length > 0) {
        const fetched = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const profile = await userService.getUserById(id as number);
              return [id, profile] as const;
            } catch {
              return [id, null] as const;
            }
          })
        );
        setBuyerProfiles(prev => {
          const updated = { ...prev };
          fetched.forEach(([id, profile]) => { if (profile) updated[id as number] = profile; });
          return updated;
        });
      }
    } catch (e: any) {
      setAlert({ type: 'error', title: 'Error', message: 'Could not load interested buyers.' });
    } finally {
      setLoadingBuyers(false);
    }
  };

  const handleMessageBuyer = async (order: any) => {
    setMessagingBuyerId(order.buyerId);
    try {
      const buyerName = buyerProfiles[order.buyerId]?.name || 'Car Owner';
      const existing = await messageService.getConversationWithUser(user?.userId, order.buyerId).catch(() => null);
      const chatJobId = existing ? existing.job_id : -order.id;
      setBuyersModalPart(null);
      navigation.navigate('Chat', {
        job: { id: chatJobId, title: order.partName },
        otherUserId: order.buyerId,
        otherUserName: buyerName,
      });
    } finally {
      setMessagingBuyerId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.header}>
        <Text style={styles.headerTitle}>My Parts Listings</Text>
      </LinearGradient>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 130 }}>
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
        ) : parts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="construct-outline" size={40} color="#9ca3af" />
            </View>
            <Text style={styles.emptyText}>No listings yet</Text>
            <Text style={styles.emptySubText}>Tap + to list a spare part</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={openAddModal}>
              <Text style={styles.addFirstBtnText}>Add First Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            {parts.map((part, index) => (
              <PartCard
                key={part.id}
                part={part}
                index={index}
                onOpenEdit={() => openEditModal(part)}
                onOpenBuyers={() => openBuyersModal(part)}
                onMarkSold={() => setSoldConfirm(part)}
                onDelete={() => setDeleteConfirm(part)}
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add/Edit Part Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPartId ? 'Edit Listing' : 'List a Part'}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingPartId(null); }}>
                <Ionicons name="close" size={24} color="#1b1b1b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Photo</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickImage} disabled={uploadingImage}>
                {localImageUri ? (
                  <Image source={{ uri: localImageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={ACCENT} />
                    <Text style={styles.imagePickerText}>Add a photo</Text>
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.imageUploadingOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                {localImageUri && !uploadingImage && (
                  <View style={styles.imageCheckBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  </View>
                )}
              </TouchableOpacity>
              {localImageUri && (
                <TouchableOpacity onPress={handlePickImage} disabled={uploadingImage}>
                  <Text style={styles.changePhotoText}>Change photo</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.label}>Part Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. Toyota Corolla Alternator" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
              <Text style={styles.label}>Description *</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the part..." value={form.description} onChangeText={t => setForm({ ...form, description: t })} multiline numberOfLines={3} />
              <Text style={styles.label}>Price (GHS) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 450"
                value={form.price}
                onChangeText={t => {
                  const cleaned = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setForm({ ...form, price: cleaned });
                }}
                keyboardType="numeric"
              />
              <Text style={styles.label}>Brand</Text>
              <TextInput style={styles.input} placeholder="e.g. Denso" value={form.brand} onChangeText={t => setForm({ ...form, brand: t })} />
              <Text style={styles.label}>Car Make</Text>
              <TextInput style={styles.input} placeholder="e.g. Toyota" value={form.carMake} onChangeText={t => setForm({ ...form, carMake: t })} />
              <Text style={styles.label}>Car Model</Text>
              <TextInput style={styles.input} placeholder="e.g. Corolla" value={form.carModel} onChangeText={t => setForm({ ...form, carModel: t })} />
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.conditionChip, form.category === cat && styles.conditionChipActive]}
                    onPress={() => setForm({ ...form, category: cat })}>
                    <Text style={[styles.conditionText, form.category === cat && styles.conditionTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Condition</Text>
              <View style={styles.conditionRow}>
                {CONDITIONS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.conditionChip, form.condition === c && styles.conditionChipActive]}
                    onPress={() => setForm({ ...form, condition: c })}>
                    <Text style={[styles.conditionText, form.condition === c && styles.conditionTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploadingImage}>
                <LinearGradient colors={[ACCENT, ACCENT_DEEP]} style={styles.submitGradient}>
                  <Text style={styles.submitText}>
                    {uploadingImage ? 'Uploading image...' : editingPartId ? 'Save Changes' : 'List Part'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Interested Buyers Modal */}
      <Modal visible={!!buyersModalPart} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBuyersModalPart(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Interested Buyers</Text>
              {buyersModalPart && <Text style={styles.modalSubtitle} numberOfLines={1}>{buyersModalPart.name}</Text>}
            </View>
            <TouchableOpacity onPress={() => setBuyersModalPart(null)}>
              <Ionicons name="close" size={24} color="#1b1b1b" />
            </TouchableOpacity>
          </View>
          {loadingBuyers ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.modalBody}>
              {buyerOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="people-outline" size={40} color="#9ca3af" />
                  </View>
                  <Text style={styles.emptyText}>No orders yet</Text>
                  <Text style={styles.emptySubText}>Interested buyers will appear here</Text>
                </View>
              ) : (
                buyerOrders.map(order => {
                  const buyer = buyerProfiles[order.buyerId];
                  return (
                    <View key={order.id} style={styles.buyerCard}>
                      <View style={styles.buyerCardHeader}>
                        <View style={styles.buyerAvatar}>
                          <Text style={styles.buyerAvatarText}>{buyer?.name?.[0]?.toUpperCase() || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.buyerName}>{buyer?.name || 'Car Owner'}</Text>
                          <Text style={styles.buyerPrice}>
                            {order.proposedPrice != null ? `Offered: GHS ${order.proposedPrice}` : `GHS ${order.price}`}
                          </Text>
                        </View>
                        <View style={[styles.orderStatusBadge, { backgroundColor: getOrderStatusColor(order.status) + '20' }]}>
                          <Text style={[styles.orderStatusText, { color: getOrderStatusColor(order.status) }]}>
                            {order.status === 'ACCEPTED' ? 'RESERVED' : order.status}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.messageBuyerBtn}
                        onPress={() => handleMessageBuyer(order)}
                        disabled={messagingBuyerId === order.buyerId}>
                        {messagingBuyerId === order.buyerId ? (
                          <ActivityIndicator size="small" color={ACCENT} />
                        ) : (
                          <>
                            <Ionicons name="chatbubble-outline" size={14} color={ACCENT} />
                            <Text style={styles.messageBuyerBtnText}>Message</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!soldConfirm}
        icon="checkmark-done-outline"
        title="Mark as Sold"
        message={`Mark "${soldConfirm?.name}" as sold?`}
        confirmText="Mark Sold"
        accentColor={ACCENT}
        onConfirm={confirmMarkSold}
        onCancel={() => setSoldConfirm(null)}
      />
      <ConfirmDialog
        visible={!!deleteConfirm}
        icon="trash-outline"
        title="Delete Listing"
        message={`Permanently delete "${deleteConfirm?.name}"?`}
        confirmText="Delete"
        destructive
        onConfirm={confirmDeleteListing}
        onCancel={() => setDeleteConfirm(null)}
      />
      <Modal visible={!!alert} transparent animationType="fade" onRequestClose={() => setAlert(null)}>
        <View style={styles.alertOverlay}>
          {alert && (
            <AppAlertCard
              type={alert.type}
              title={alert.title}
              message={alert.message}
              accentColor={ACCENT}
              onClose={() => setAlert(null)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#ffffff' },
  fab: { position: 'absolute', right: SPACING.lg, bottom: 110, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1, padding: SPACING.lg },
  partCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  partCardRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: 8, alignItems: 'center' },
  partThumb: { width: 64, height: 64, borderRadius: RADIUS.md },
  partThumbPlaceholder: { width: 64, height: 64, borderRadius: RADIUS.md, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  partName: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
  partDesc: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginBottom: 4 },
  partPrice: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: ACCENT },
  partMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  metaChip: { fontSize: FONT_SIZES.xs, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  buyersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#bfdbfe' },
  buyersBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#2563eb' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fffbeb', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fde68a' },
  editBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  soldBtn: { flex: 1, padding: 8, backgroundColor: '#f0fdf4', borderRadius: RADIUS.md, alignItems: 'center', minWidth: 90 },
  soldBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#10b981' },
  deleteBtn: { width: 36, height: 36, backgroundColor: '#fef2f2', borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 4, backgroundColor: '#fff', borderRadius: RADIUS.md },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#9ca3af' },
  emptySubText: { fontSize: FONT_SIZES.sm, color: '#d1d5db' },
  addFirstBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ACCENT, borderRadius: RADIUS.md },
  addFirstBtnText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#fff' },
  modal: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#1b1b1b' },
  modalSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginTop: 2 },
  modalBody: { padding: SPACING.lg },
  label: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: FONT_SIZES.md, color: '#1b1b1b' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipScroll: { marginBottom: 4 },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', marginRight: 6, marginBottom: 6 },
  conditionChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  conditionText: { fontSize: FONT_SIZES.sm, color: '#6b7280', fontWeight: '600' },
  conditionTextActive: { color: '#fff' },
  submitBtn: { marginTop: 24, borderRadius: RADIUS.md, overflow: 'hidden' },
  submitGradient: { padding: 16, alignItems: 'center' },
  submitText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  imagePickerBtn: { width: 120, height: 120, borderRadius: RADIUS.md, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imagePickerPlaceholder: { alignItems: 'center', gap: 6 },
  imagePickerText: { fontSize: FONT_SIZES.xs, color: ACCENT, fontWeight: '600' },
  imagePreview: { width: '100%', height: '100%' },
  imageUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  imageCheckBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 10 },
  changePhotoText: { fontSize: FONT_SIZES.sm, color: ACCENT, fontWeight: '600', marginTop: 8 },
  buyerCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: '#f3f4f6' },
  buyerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  buyerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  buyerAvatarText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  buyerName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b1b1b' },
  buyerPrice: { fontSize: FONT_SIZES.xs, color: '#6b7280', marginTop: 2 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  orderStatusText: { fontSize: 10, fontWeight: '700' },
  messageBuyerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, backgroundColor: '#fffbeb', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fde68a' },
  messageBuyerBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: ACCENT },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
});