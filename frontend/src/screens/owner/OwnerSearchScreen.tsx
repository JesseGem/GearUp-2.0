import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput, ActivityIndicator, Alert, Linking, Modal, Platform, Animated, Image
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { userService } from '../../services/userService';
import { locationService } from '../../services/locationService';
import { partsService } from '../../services/partsService';
import { messageService } from '../../services/messageService';
import { SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { ConfirmDialogCard } from '../../components/ConfirmDialog';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function OwnerSearchScreen({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'map' | 'list' | 'parts'>('map');
  const [listSubTab, setListSubTab] = useState<'all' | 'favorites'>('all');
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const enterAnim = useRef(new Animated.Value(0)).current;

  const [parts, setParts] = useState<any[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsSearchQuery, setPartsSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [buyingPart, setBuyingPart] = useState(false);
  const [myOrderedPartIds, setMyOrderedPartIds] = useState<number[]>([]);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);

  useEffect(() => {
    loadData();
    Animated.timing(enterAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    setRouteCoords([]);
    setRouteInfo(null);
    setFetchingRoute(false);
  }, [selectedMechanic?.id]);

  useEffect(() => {
    if (view === 'parts' && parts.length === 0) {
      loadParts();
    }
  }, [view]);

  const loadData = async () => {
    try {
      const [mechanicsData, coords, favIds] = await Promise.all([
        userService.getAllMechanics(),
        locationService.getCurrentLocation(),
        userService.getFavoriteIds().catch(() => []),
      ]);

      setMyLocation(coords);
      setFavoriteIds(favIds || []);

      const withDistance = mechanicsData.map((m: any) => ({
        ...m,
        distance: coords && m.latitude && m.longitude
          ? calculateDistance(coords.latitude, coords.longitude, m.latitude, m.longitude)
          : null,
      }));

      const sorted = withDistance.sort((a: any, b: any) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return a.name.localeCompare(b.name);
      });

      setMechanics(sorted);
      setFiltered(sorted);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadParts = async () => {
    setLoadingParts(true);
    try {
      const [data, myOrders] = await Promise.all([
        partsService.getAvailableParts(),
        partsService.getMyOrders().catch(() => []),
      ]);
      setParts(data);
      setMyOrderedPartIds((myOrders || []).map((o: any) => o.partId));
    } catch (e: any) {
      Alert.alert('Error', 'Could not load parts');
    } finally {
      setLoadingParts(false);
    }
  };

  const toggleFavorite = async (mechanicId: number) => {
    const isFav = favoriteIds.includes(mechanicId);
    setFavoriteIds(prev => isFav ? prev.filter(id => id !== mechanicId) : [...prev, mechanicId]);
    try {
      if (isFav) {
        await userService.removeFavorite(mechanicId);
      } else {
        await userService.addFavorite(mechanicId);
      }
    } catch (e: any) {
      setFavoriteIds(prev => isFav ? [...prev, mechanicId] : prev.filter(id => id !== mechanicId));
      Alert.alert('Error', 'Could not update favorite. Please try again.');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFiltered(mechanics);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(mechanics.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q)
    ));
  };

  const fetchRoute = async () => {
    if (!myLocation || !selectedMechanic) {
      Alert.alert('Location unavailable', "We couldn't get your current location to draw a route.");
      return;
    }
    setFetchingRoute(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${myLocation.longitude},${myLocation.latitude};${selectedMechanic.longitude},${selectedMechanic.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const coords = routeData.geometry.coordinates.map((c: [number, number]) => ({
          latitude: c[1],
          longitude: c[0],
        }));
        setRouteCoords(coords);
        const km = (routeData.distance / 1000).toFixed(1);
        const mins = Math.round(routeData.duration / 60);
        setRouteInfo({ distance: `${km} km`, duration: `${mins} min` });
      } else {
        Alert.alert('No route found', "Couldn't find a driving route between these points.");
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load the route. Check your internet connection.');
    } finally {
      setFetchingRoute(false);
    }
  };

  const openAppleMaps = () => {
    const dest = `${selectedMechanic.latitude},${selectedMechanic.longitude}`;
    const src = myLocation ? `${myLocation.latitude},${myLocation.longitude}` : null;
    const url = src ? `maps://app?saddr=${src}&daddr=${dest}` : `maps://app?daddr=${dest}`;
    setShowMapModal(false);
    Linking.openURL(url);
  };

  const openGoogleMaps = () => {
    const dest = `${selectedMechanic.latitude},${selectedMechanic.longitude}`;
    const src = myLocation ? `${myLocation.latitude},${myLocation.longitude}` : null;
    const url = src
      ? `https://www.google.com/maps/dir/?api=1&origin=${src}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    setShowMapModal(false);
    Linking.openURL(url);
  };

  const openPartDetail = async (part: any) => {
    setSelectedPart(part);
    setSellerInfo(null);
    setLoadingSeller(true);
    try {
      const seller = await userService.getUserById(part.sellerId);
      setSellerInfo(seller);
    } catch (e) {
      // seller info is a nice-to-have; ignore failure
    } finally {
      setLoadingSeller(false);
    }
  };

  const confirmBuyNow = async () => {
    setShowBuyConfirm(false);
    setBuyingPart(true);
    try {
      const order = await partsService.createOrder(selectedPart.id);
      const sellerName = sellerInfo?.name || 'Mechanic';

      // Reuse an existing conversation thread with this mechanic if one exists
      // (whether from a past job or a past part order), instead of always starting fresh.
      let chatJobId: number;
      let chatTitle: string;
      console.log('Looking up conversation between', Number(user?.userId), 'and', Number(order.sellerId));
      let existing = null;
      try {
        existing = await messageService.getConversationWithUser(Number(user?.userId), Number(order.sellerId));
      } catch (lookupError: any) {
        console.log('getConversationWithUser failed:', lookupError.message);
      }
      if (existing) {
        chatJobId = existing.job_id;
        chatTitle = existing.job_id < 0 ? 'Chat with Mechanic' : `Order: ${order.partName}`;
      } else {
        chatJobId = -order.id; // negative to avoid colliding with real job IDs (no FK constraint on messages.job_id)
        chatTitle = `Order: ${order.partName}`;
      }

      await messageService.sendPartCard(chatJobId, user?.userId, order.sellerId, {
        orderId: order.id,
        partId: selectedPart.id,
        partName: order.partName,
        imageUrl: selectedPart.imageUrl || null,
        price: order.price,
        status: order.status,
        buyerId: user?.userId,
        sellerId: order.sellerId,
      });

      setMyOrderedPartIds(prev => [...prev, selectedPart.id]);
      setSelectedPart(null);

      navigation.navigate('Chat', {
        job: { id: chatJobId, title: chatTitle },
        otherUserId: order.sellerId,
        otherUserName: sellerName,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not complete purchase. Please try again.');
    } finally {
      setBuyingPart(false);
    }
  };

  const defaultRegion = myLocation
    ? { ...myLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 6.6745, longitude: -1.5716, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const mechanicsWithLocation = filtered.filter(m => m.latitude && m.longitude);
  const hasRoute = routeCoords.length > 0;

  const listDisplayed = listSubTab === 'favorites'
    ? filtered.filter(m => favoriteIds.includes(m.id))
    : filtered;

  const filteredParts = parts.filter(p =>
    !partsSearchQuery.trim() ||
    p.name?.toLowerCase().includes(partsSearchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(partsSearchQuery.toLowerCase()) ||
    p.carMake?.toLowerCase().includes(partsSearchQuery.toLowerCase())
  );

  const partRows: any[][] = [];
  for (let i = 0; i < filteredParts.length; i += 2) {
    partRows.push(filteredParts.slice(i, i + 2));
  }

  const alreadyRequested = selectedPart ? myOrderedPartIds.includes(selectedPart.id) : false;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.header}>
        <Text style={styles.headerTitle}>Find a Mechanic</Text>
        {view !== 'parts' ? (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or location..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search parts, brand, car make..."
              value={partsSearchQuery}
              onChangeText={setPartsSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {partsSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setPartsSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'map' && styles.toggleBtnActive]}
            onPress={() => setView('map')}
            activeOpacity={0.8}>
            <Ionicons name="map-outline" size={16} color={view === 'map' ? '#1b4332' : '#e5e7eb'} />
            <Text style={[styles.toggleText, view === 'map' && styles.toggleTextActive]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'list' && styles.toggleBtnActive]}
            onPress={() => setView('list')}
            activeOpacity={0.8}>
            <Ionicons name="list-outline" size={16} color={view === 'list' ? '#1b4332' : '#e5e7eb'} />
            <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'parts' && styles.toggleBtnActive]}
            onPress={() => setView('parts')}
            activeOpacity={0.8}>
            <Ionicons name="cube-outline" size={16} color={view === 'parts' ? '#1b4332' : '#e5e7eb'} />
            <Text style={[styles.toggleText, view === 'parts' && styles.toggleTextActive]}>Parts</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {view === 'parts' ? (
        loadingParts ? (
          <ActivityIndicator style={{ flex: 1 }} color="#1b4332" />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
            <Text style={styles.resultsCount}>{filteredParts.length} parts available</Text>
            {filteredParts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="cube-outline" size={40} color="#9ca3af" />
                </View>
                <Text style={styles.emptyText}>No parts found</Text>
              </View>
            ) : (
              partRows.map((row, i) => (
                <View key={i} style={styles.partsRow}>
                  {row.map(part => {
                    const requested = myOrderedPartIds.includes(part.id);
                    return (
                      <TouchableOpacity
                        key={part.id}
                        style={styles.partCard}
                        activeOpacity={0.85}
                        onPress={() => openPartDetail(part)}>
                        {part.imageUrl ? (
                          <Image source={{ uri: part.imageUrl }} style={styles.partImage} />
                        ) : (
                          <View style={styles.partImagePlaceholder}>
                            <Ionicons name="image-outline" size={32} color="#d1d5db" />
                          </View>
                        )}
                        {requested && (
                          <View style={styles.requestedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#fff" />
                            <Text style={styles.requestedBadgeText}>Requested</Text>
                          </View>
                        )}
                        <View style={styles.partCardBody}>
                          <Text style={styles.partCardName} numberOfLines={2}>{part.name}</Text>
                          {part.condition && (
                            <Text style={styles.partCardCondition}>{part.condition}</Text>
                          )}
                          <Text style={styles.partCardPrice}>GHS {part.price}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {row.length === 1 && <View style={styles.partCardSpacer} />}
                </View>
              ))
            )}
          </ScrollView>
        )
      ) : loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1b4332" />
      ) : view === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={defaultRegion}>

            {hasRoute && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#2563eb"
                strokeWidth={4}
              />
            )}

            {myLocation && (
              <Marker coordinate={myLocation} title="You">
                <View style={styles.myPin}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
              </Marker>
            )}

            {mechanicsWithLocation.map(m => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                title={m.name}
                description={m.location || ''}
                onPress={() => setSelectedMechanic(m)}>
                <View style={styles.mechanicPin}>
                  <Ionicons name="construct" size={16} color="#fff" />
                </View>
              </Marker>
            ))}
          </MapView>

          {selectedMechanic && (
            <View style={styles.selectedCard}>
              <View style={styles.selectedHeader}>
                <View style={styles.selectedAvatar}>
                  <Text style={styles.selectedAvatarText}>{selectedMechanic.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedMechanic.name}</Text>
                  {selectedMechanic.location && (
                    <Text style={styles.selectedLocation}>{selectedMechanic.location}</Text>
                  )}
                  {selectedMechanic.distance !== null && (
                    <Text style={styles.selectedDistance}>
                      {selectedMechanic.distance < 1
                        ? `${Math.round(selectedMechanic.distance * 1000)}m away`
                        : `${selectedMechanic.distance.toFixed(1)}km away`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(selectedMechanic.id)} style={styles.starBtn}>
                  <Ionicons
                    name={favoriteIds.includes(selectedMechanic.id) ? 'star' : 'star-outline'}
                    size={22}
                    color={favoriteIds.includes(selectedMechanic.id) ? '#f59e0b' : '#9ca3af'}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedMechanic(null)}>
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {routeInfo && (
                <View style={styles.routeInfoRow}>
                  <Ionicons name="time-outline" size={14} color="#1b4332" />
                  <Text style={styles.routeInfoText}>{routeInfo.duration}</Text>
                  <Ionicons name="speedometer-outline" size={14} color="#1b4332" style={{ marginLeft: 10 }} />
                  <Text style={styles.routeInfoText}>{routeInfo.distance}</Text>
                </View>
              )}

              {selectedMechanic.bio && (
                <Text style={styles.selectedBio} numberOfLines={2}>{selectedMechanic.bio}</Text>
              )}
              <View style={styles.selectedActionsRow}>
                <TouchableOpacity
                  style={styles.directionsBtnSmall}
                  disabled={fetchingRoute}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (hasRoute) {
                      setShowMapModal(true);
                    } else {
                      fetchRoute();
                    }
                  }}>
                  {fetchingRoute ? (
                    <ActivityIndicator size="small" color="#1b4332" />
                  ) : (
                    <Ionicons name={hasRoute ? 'map-outline' : 'navigate'} size={16} color="#1b4332" />
                  )}
                  <Text style={styles.directionsBtnSmallText}>
                    {fetchingRoute ? 'Loading...' : hasRoute ? 'Open in Maps' : 'Directions'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.requestBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Alert.alert(
                      'Request Mechanic',
                      `Send a job request to ${selectedMechanic.name}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Create Job', onPress: () => navigation.navigate('Jobs') },
                      ]
                    );
                  }}>
                  <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.requestGradient}>
                    <Text style={styles.requestBtnText}>Request this Mechanic</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filtered.length} mechanics found</Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.subTabRow}>
            <TouchableOpacity
              style={[styles.subTabBtn, listSubTab === 'all' && styles.subTabBtnActive]}
              onPress={() => setListSubTab('all')}
              activeOpacity={0.85}>
              <Text style={[styles.subTabText, listSubTab === 'all' && styles.subTabTextActive]}>All Mechanics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabBtn, listSubTab === 'favorites' && styles.subTabBtnActive]}
              onPress={() => setListSubTab('favorites')}
              activeOpacity={0.85}>
              <Ionicons name="star" size={14} color={listSubTab === 'favorites' ? '#fff' : '#f59e0b'} />
              <Text style={[styles.subTabText, listSubTab === 'favorites' && styles.subTabTextActive]}>Favorites</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
            <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
              <Text style={styles.resultsCount}>
                {listSubTab === 'favorites'
                  ? `${listDisplayed.length} favorite mechanic${listDisplayed.length === 1 ? '' : 's'}`
                  : `${listDisplayed.length} mechanics found`}
              </Text>
              {listDisplayed.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name={listSubTab === 'favorites' ? 'star-outline' : 'search-outline'} size={40} color="#9ca3af" />
                  </View>
                  <Text style={styles.emptyText}>
                    {listSubTab === 'favorites' ? 'No favorite mechanics yet' : 'No mechanics found'}
                  </Text>
                  {listSubTab === 'favorites' && (
                    <Text style={styles.emptySubtext}>Tap the star on any mechanic to save them here</Text>
                  )}
                </View>
              ) : (
                listDisplayed.map(m => (
                  <View key={m.id} style={styles.mechanicCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardAvatar}>
                        <Text style={styles.cardAvatarText}>{m.name?.[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{m.name}</Text>
                        {m.location && (
                          <View style={styles.cardLocationRow}>
                            <Ionicons name="location-outline" size={12} color="#6b7280" />
                            <Text style={styles.cardLocation}>{m.location}</Text>
                          </View>
                        )}
                        {m.distance !== null && (
                          <Text style={styles.cardDistance}>
                            {m.distance < 1
                              ? `${Math.round(m.distance * 1000)}m away`
                              : `${m.distance.toFixed(1)}km away`}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => toggleFavorite(m.id)} style={styles.starBtn}>
                        <Ionicons
                          name={favoriteIds.includes(m.id) ? 'star' : 'star-outline'}
                          size={22}
                          color={favoriteIds.includes(m.id) ? '#f59e0b' : '#9ca3af'}
                        />
                      </TouchableOpacity>
                      {m.distance !== null && (
                        <View style={styles.nearBadge}>
                          <Text style={styles.nearBadgeText}>
                            {m.distance < 5 ? '🟢 Near' : '🔵 Far'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {m.bio && <Text style={styles.cardBio} numberOfLines={2}>{m.bio}</Text>}
                    <TouchableOpacity
                      style={styles.requestBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        Alert.alert(
                          'Request Mechanic',
                          `Send a job request to ${m.name}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Create Job', onPress: () => navigation.navigate('Jobs') },
                          ]
                        );
                      }}>
                      <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.requestGradient}>
                        <Text style={styles.requestBtnText}>Request this Mechanic</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </Animated.View>
          </ScrollView>
        </View>
      )}

      {/* Maps app picker */}
      <Modal
        visible={showMapModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMapModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMapModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Open Directions In</Text>
            <Text style={styles.modalSubtitle}>Choose a maps app for turn-by-turn navigation</Text>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.modalOption} onPress={openAppleMaps} activeOpacity={0.85}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#e5e7eb' }]}>
                  <Ionicons name="map" size={20} color="#1b1b1b" />
                </View>
                <Text style={styles.modalOptionText}>Apple Maps</Text>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalOption} onPress={openGoogleMaps} activeOpacity={0.85}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="navigate" size={20} color="#1b4332" />
              </View>
              <Text style={styles.modalOptionText}>Google Maps</Text>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMapModal(false)} activeOpacity={0.85}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Part detail modal */}
      <Modal
        visible={!!selectedPart}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPart(null)}>
        {selectedPart && (
          <View style={styles.detailModal}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Part Details</Text>
              <TouchableOpacity onPress={() => setSelectedPart(null)}>
                <Ionicons name="close" size={24} color="#1b1b1b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailModalBody} contentContainerStyle={{ paddingBottom: 40 }}>
              {selectedPart.imageUrl ? (
                <Image source={{ uri: selectedPart.imageUrl }} style={styles.detailImage} />
              ) : (
                <View style={styles.detailImagePlaceholder}>
                  <Ionicons name="image-outline" size={48} color="#d1d5db" />
                </View>
              )}

              <Text style={styles.detailName}>{selectedPart.name}</Text>
              <Text style={styles.detailPrice}>GHS {selectedPart.price}</Text>

              {alreadyRequested && (
                <View style={styles.alreadyRequestedBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#1b4332" />
                  <Text style={styles.alreadyRequestedText}>You've already requested this part</Text>
                </View>
              )}

              <View style={styles.detailChipsRow}>
                {selectedPart.condition && <View style={styles.detailChip}><Text style={styles.detailChipText}>{selectedPart.condition}</Text></View>}
                {selectedPart.brand && <View style={styles.detailChip}><Text style={styles.detailChipText}>{selectedPart.brand}</Text></View>}
                {selectedPart.carMake && <View style={styles.detailChip}><Text style={styles.detailChipText}>{selectedPart.carMake} {selectedPart.carModel}</Text></View>}
              </View>

              <Text style={styles.detailSectionTitle}>Description</Text>
              <Text style={styles.detailDescription}>{selectedPart.description}</Text>

              <Text style={styles.detailSectionTitle}>Sold By</Text>
              {loadingSeller ? (
                <ActivityIndicator color="#1b4332" style={{ marginTop: 8 }} />
              ) : (
                <View style={styles.sellerRow}>
                  <View style={styles.sellerAvatar}>
                    <Text style={styles.sellerAvatarText}>{sellerInfo?.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sellerName}>{sellerInfo?.name || 'Mechanic'}</Text>
                    {sellerInfo?.location && <Text style={styles.sellerLocation}>{sellerInfo.location}</Text>}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => setShowBuyConfirm(true)}
                disabled={buyingPart}
                activeOpacity={0.85}>
                <LinearGradient colors={['#1b4332', '#2d6a4f']} style={styles.buyBtnGradient}>
                  {buyingPart ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="bag-check-outline" size={18} color="#fff" />
                      <Text style={styles.buyBtnText}>{alreadyRequested ? 'Request Again' : 'Buy Now'}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

            {/* Inline confirmation overlay — NOT a separate Modal, avoids nested-Modal issues on iOS */}
            {showBuyConfirm && (
              <View style={styles.confirmOverlay}>
                <ConfirmDialogCard
                  icon="bag-check"
                  title="Confirm Purchase"
                  message={`Buy "${selectedPart?.name}" for GHS ${selectedPart?.price}? This will start a chat with the seller to arrange payment and pickup/delivery.`}
                  confirmText="Buy Now"
                  onConfirm={confirmBuyNow}
                  onCancel={() => setShowBuyConfirm(false)}
                />
              </View>
            )}
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, gap: SPACING.md, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#ffffff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, height: 46, gap: 8 },
  searchInput: { flex: 1, fontSize: FONT_SIZES.md, color: '#1b1b1b' },
  viewToggle: { flexDirection: 'row', gap: 6 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)' },
  toggleBtnActive: { backgroundColor: '#fff' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#e5e7eb' },
  toggleTextActive: { color: '#1b4332' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  myPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 4 },
  mechanicPin: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 4 },
  selectedCard: { position: 'absolute', bottom: 140, left: 16, right: 16, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: 8 },
  selectedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center' },
  selectedAvatarText: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#fff' },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b' },
  selectedLocation: { fontSize: FONT_SIZES.xs, color: '#6b7280' },
  selectedDistance: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: '#1b4332' },
  selectedBio: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginBottom: 10 },
  routeInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, alignSelf: 'flex-start' },
  routeInfoText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b4332', marginLeft: 4 },
  countBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(27,67,50,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  countText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: '#fff' },
  subTabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: 4, backgroundColor: '#f9fafb' },
  subTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  subTabBtnActive: { backgroundColor: '#1b4332', borderColor: '#1b4332' },
  subTabText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#6b7280' },
  subTabTextActive: { color: '#fff' },
  list: { flex: 1, padding: SPACING.lg },
  resultsCount: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginBottom: SPACING.md },
  mechanicCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: 8 },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center' },
  cardAvatarText: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#fff' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b' },
  cardLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardLocation: { fontSize: FONT_SIZES.xs, color: '#6b7280' },
  cardDistance: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: '#1b4332', marginTop: 2 },
  nearBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  nearBadgeText: { fontSize: 10, fontWeight: '600', color: '#1b4332' },
  cardBio: { fontSize: FONT_SIZES.sm, color: '#6b7280', marginBottom: 10 },
  requestBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  requestGradient: { padding: 12, alignItems: 'center' },
  requestBtnText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#fff' },
  selectedActionsRow: { flexDirection: 'row', gap: 8 },
  directionsBtnSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  directionsBtnSmallText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b4332' },
  starBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8, backgroundColor: '#fff', borderRadius: RADIUS.md },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyText: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: FONT_SIZES.sm, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', textAlign: 'center' },
  modalSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: SPACING.lg },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOptionText: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '600', color: '#1b1b1b' },
  modalCancel: { marginTop: SPACING.md, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: RADIUS.md },
  modalCancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#6b7280' },
  partsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  partCard: { flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  partCardSpacer: { flex: 1 },
  partImage: { width: '100%', height: 120, backgroundColor: '#f3f4f6' },
  partImagePlaceholder: { width: '100%', height: 120, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  partCardBody: { padding: SPACING.sm },
  partCardName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: '#1b1b1b', minHeight: 34 },
  partCardCondition: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  partCardPrice: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b4332', marginTop: 4 },
  requestedBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1b4332', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  requestedBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  detailModal: { flex: 1, backgroundColor: '#f9fafb' },
  detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailModalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#1b1b1b' },
  detailModalBody: { padding: SPACING.lg },
  detailImage: { width: '100%', height: 220, borderRadius: RADIUS.md, backgroundColor: '#f3f4f6', marginBottom: SPACING.md },
  detailImagePlaceholder: { width: '100%', height: 220, borderRadius: RADIUS.md, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  detailName: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: '#1b1b1b' },
  detailPrice: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: '#1b4332', marginTop: 4 },
  alreadyRequestedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', padding: 10, borderRadius: RADIUS.md, marginTop: SPACING.md },
  alreadyRequestedText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: '#1b4332' },
  detailChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md, marginBottom: SPACING.lg },
  detailChip: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  detailChipText: { fontSize: FONT_SIZES.xs, fontWeight: '600', color: '#1b4332' },
  detailSectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#1b1b1b', marginTop: SPACING.md, marginBottom: 6 },
  detailDescription: { fontSize: FONT_SIZES.sm, color: '#6b7280', lineHeight: 20 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: '#fff', padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#f3f4f6' },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1b4332', justifyContent: 'center', alignItems: 'center' },
  sellerAvatarText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  sellerName: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: '#1b1b1b' },
  sellerLocation: { fontSize: FONT_SIZES.xs, color: '#6b7280' },
  buyBtn: { marginTop: SPACING.xl, borderRadius: RADIUS.md, overflow: 'hidden' },
  buyBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  buyBtnText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
  confirmOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, zIndex: 10 },
  confirmCard: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: SPACING.xl, width: '100%', alignItems: 'center' },
  confirmIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  confirmTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: '#1b1b1b', marginBottom: 8 },
  confirmSubtitle: { fontSize: FONT_SIZES.sm, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  confirmActionsRow: { flexDirection: 'row', gap: SPACING.md, alignSelf: 'stretch' },
  confirmCancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: '#f3f4f6', alignItems: 'center' },
  confirmCancelText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: '#6b7280' },
  confirmBuyBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  confirmBuyGradient: { padding: 14, alignItems: 'center' },
  confirmBuyText: { fontSize: FONT_SIZES.md, fontWeight: '700', color: '#fff' },
});