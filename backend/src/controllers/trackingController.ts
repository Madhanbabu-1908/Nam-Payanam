getLiveLocation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tripId } = req.params;
      
      // Get trip details with coordinates
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .select('start_latitude, start_longitude, end_latitude, end_longitude, start_location, destination')
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        return res.status(404).json({ success: false, error: 'Trip not found' });
      }

      // Get latest live location
      const { data: currentLocation, error: locError } = await supabaseAdmin
        .from('location_logs')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (locError && locError.code !== 'PGRST116') throw locError;

      // Build route array: [Start, ...Current, End]
      const route: [number, number][] = [];

      // Add Start Point
      if (trip.start_latitude && trip.start_longitude) {
        route.push([trip.start_latitude, trip.start_longitude]);
      }

      // Add Current Location (if exists)
      if (currentLocation) {
        route.push([currentLocation.latitude, currentLocation.longitude]);
      }

      // Add End Point
      if (trip.end_latitude && trip.end_longitude) {
        route.push([trip.end_latitude, trip.end_longitude]);
      }

      res.json({ 
        success: true, 
         { 
           currentLocation: currentLocation || null,
           route,
           startLocation: trip.start_location,
           destination: trip.destination,
           startCoords: trip.start_latitude ? [trip.start_latitude, trip.start_longitude] : null,
           endCoords: trip.end_latitude ? [trip.end_latitude, trip.end_longitude] : null
         } 
      });
    } catch (error: any) {
      next(error);
    }
  },