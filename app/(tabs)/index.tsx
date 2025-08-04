import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import KeyEvent from 'react-native-keyevent';

export default function HomeScreen() {
	const [facing, setFacing] = useState<CameraType>('back');
	const [torch, setTorch] = useState<boolean>(false);
	const [lastImage, setLastImage] = useState<any>(null);
	const [permission, requestPermission] = useCameraPermissions();
	const cameraRef = useRef(null);
	const [zoom, setZoom] = useState(0);
	const [ws, setWs] = useState<any>(null);

	useEffect(() => {
		const socket = new WebSocket('ws://0.0.0.0:8080');
		socket.onopen = () => {
			console.log('WebSocket connected');
		};
		setWs(socket);

		return () => {
			socket.close();
		};
	}, []);

	useEffect(() => {
		KeyEvent.onKeyDownListener((keyEvent: any) => {
			console.log(keyEvent);
			if (keyEvent.keyCode === 24) {
				setZoom(z => Math.min(z + 0.05, 1));
			}
			if (keyEvent.keyCode === 25) {
				setZoom(z => Math.max(z - 0.05, 0));
			}
		});

		return () => {
			KeyEvent.removeKeyDownListener();
		};
	}, []);

	useEffect(() => {
		(async () => {
			const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();

			if (status !== 'granted') {
				if (canAskAgain) {
					const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
					if (newStatus !== 'granted') {
						return;
					}
				} else {
					return;
				}
			}
		})();
	}, []);

	useEffect(() => {
		const fetchLastImage = async () => {
			const album = await MediaLibrary.getAlbumAsync('OpenCam');
			if (album) {
				const { assets } = await MediaLibrary.getAssetsAsync({
					album: album,
					sortBy: [[MediaLibrary.SortBy.creationTime, false]],
					first: 1,
				});

				if (assets.length > 0) {
					setLastImage(assets[0].uri);
				}
			}
		};

		if (lastImage == null) {
			const k = require('@/assets/images/default-last-image.png');
			setLastImage(k);
		}

		fetchLastImage();
	}, []);
	
	const ensurePermissions = async () => {
		const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
		if (status !== 'granted') {
			const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
			if (newStatus !== 'granted') {
				alert("Permission requise pour enregistrer des photos.");
				return false;
			}
		}
		return true;
	};

	
		const takePhoto = async () => {
	try {
		if (!cameraRef.current) return;
		const hasPermission = await ensurePermissions();
		if (!hasPermission) return;

		const options = { quality: 1, base64: true, exif: false, skipProcessing: true };
		const photo = await cameraRef.current.takePictureAsync(options);
		setLastImage(photo);
		
		const asset = await MediaLibrary.createAssetAsync(photo.uri);

const albumName = 'OpenCam';
let album = await MediaLibrary.getAlbumAsync(albumName);

if (!album) {
  album = await MediaLibrary.createAlbumAsync(albumName, asset, true);
} else {
  await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, true);
}


		  /*
		const fileName = `OpenCam_${Date.now()}.jpg`;
		const newPath = FileSystem.documentDirectory + fileName;
		
		const { status } = await MediaLibrary.requestPermissionsAsync();
		console.log(status);
		if (status !== 'granted') {
		  Alert.alert(
			'Permission requise',
			'L’application a besoin d’un accès aux fichiers pour enregistrer les photos.',
			[{ text: 'OK' }]
		  );
		  return;
		}

		const asset = await MediaLibrary.createAssetAsync(newPath);

		  const albumName = 'OpenCam';
		  let album = await MediaLibrary.getAlbumAsync(albumName);

		  if (!album) {
			album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
		  } else {
			await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
		  }
		  
		  LOG  granted
 ERROR  ❌ Erreur lors de la capture de la photo : [Error: Unable to copy file into external storage.]
 */

		ws.send(JSON.stringify({
			type: 'image',
			data: photo.base64,
		}));

	} catch (error) {
		console.error("❌ Erreur lors de la capture de la photo :", error);
	}
};



	if (!permission) {
		return <View />;
	}

	if (!permission.granted) {
		return (
			<View style={styles.containerPerms}>
				<Text style={styles.message}>We need your permission to show the camera and save files</Text>
				<TouchableOpacity onPress={requestPermission} style={styles.button1}>
					<Text style={styles.text1}>Grant Permission</Text>
				</TouchableOpacity>
			</View>
		);
	}

	function toggleCameraFacing() {
		setFacing(current => (current === 'back' ? 'front' : 'back'));
	}

	return (
		<View style={styles.container}>
			<CameraView
				ref={cameraRef}
				style={styles.camera}
				facing={facing}
				enableTorch={torch}
				mirror={true}
				mute={false}
				zoom={zoom} // 0-1
				videoQuality={'2160p'} // Specify the quality of the recorded video. Use one of VideoQuality possible values: for 16:9 resolution 2160p, 1080p, 720p, 480p : Android only and for 4:3 4:3 (the size is 640x480). If the chosen quality is not available for a device, the highest available is chosen.
				mode={'picture'} // picture, video
				onCameraReady={() => { }}
				ratio={'1:1'} // '4:3' | '16:9' | '1:1'
				barcodeScannerSettings={{
					barcodeTypes: ["qr"],
				}}>
			</CameraView>
			<View style={styles.actionsContainer}>
				<View style={styles.lastImageV}>
					<Image style={styles.lastImage} source={lastImage} />
				</View>
				<View style={styles.buttonContainer}>
					<TouchableOpacity style={styles.button} onPress={takePhoto} >
						<Image style={styles.image} source={require('@/assets/images/shot.png')} />
					</TouchableOpacity>
					<TouchableOpacity style={[styles.button, styles.torch]} onPress={() => { setTorch(prev => !prev) }}>
						{torch ?
							(
								<Image style={[styles.image, styles.imgshot]} source={require(`@/assets/images/torch-on.png`)} />
							) : (
								<Image style={[styles.image, styles.imgshot]} source={require('@/assets/images/torch-off.png')} />
							)
						}
					</TouchableOpacity>
					<TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
						<Image style={styles.image} source={require('@/assets/images/facing.png')} />
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
	},
	camera: {
		flex: 1,
	},
	actionsContainer: {
		flexDirection: 'row',
		position: 'absolute',
		bottom: 50,
		gap: 32,
		paddingInline: 15,
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		backgroundColor: 'transparent',
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	button: {
		width: 50,
		height: 50,
		padding: 0,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 999,
	},
	text: {
		fontSize: 24,
		fontWeight: 'bold',
		color: 'white',
	},
	lastImageV: {
		width: 50,
		height: 50,
	},
	image: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	imgshot: {
		width: '80%',
		height: '80%',
	},
	lastImage: {
		width: '100%',
		height: '100%',
		borderRadius: 15,
	},
	torch: {
		borderWidth: 0,
		borderColor: '#999',
	},
	message: {
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 20,
		color: '#333',
	},
	secondaryText: {
		textAlign: 'center',
		fontSize: 14,
		color: '#666',
		marginBottom: 10,
	},
	text1: {
		textAlign: 'center',
		fontSize: 18,
		color: '#fff',
	},
	button1: {
		justifyContent: 'center',
		padding: 15,
		backgroundColor: '#0000ff',
		borderRadius: 999,
	},
	containerPerms: {
		flex: 1,
		justifyContent: 'center',
		padding: 24,
		backgroundColor: '#fff',
	}
});

