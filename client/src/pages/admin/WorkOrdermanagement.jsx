import React, { useState, useEffect, useRef } from 'react';
import { getWorkOrders, deleteWorkOrder, searchWorkOrders } from '../../services/workOrderService';
import WorkOrderTable from '../../components/admin/confined/WorkOrderTable';
import WorkOrderModal from '../../components/admin/confined/WorkOrderModel';
import WorkOrderSearch from '../../components/admin/confined/WorkOrderSearch';
import WorkOrderAlert from '../../components/admin/confined/WorkOrderAlert';
import { toast } from 'react-toastify';
import * as XLSX from "xlsx";

const WorkOrderManagementPage = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const searchTimeout = useRef(null);
  // State variables for delete confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all orders
  const fetchOrders = async (params = {}) => {
    setLoading(true);
    try {
      const data = Object.keys(params).length
        ? await searchWorkOrders(params)
        : await getWorkOrders();
      setOrders(data);
    } catch (error) {
      setAlert({ type: "error", message: "Failed to fetch orders" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);  // Search handlers
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    const newSearch = { ...search, [name]: value };
    setSearch(newSearch);
    
    // Implement dynamic search with debounce
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      // Special handling for ID search
      if (name === 'id' || name === 'uniqueId') {
        // If searching by ID, do a client-side filter first for better matching
        if (value.trim()) {
          const lowerCaseValue = value.toLowerCase();
          
          // First try to get all orders to ensure we have the full dataset
          getWorkOrders().then(allOrders => {
            // Filter orders that match the ID or uniqueId
            const filteredOrders = allOrders.filter(order => 
              (order._id && order._id.toLowerCase().includes(lowerCaseValue)) ||
              (order.uniqueId && order.uniqueId.toLowerCase().includes(lowerCaseValue))
            );
            
            setOrders(filteredOrders);
            setLoading(false);
          }).catch(err => {
            console.error("Error fetching all orders for ID search:", err);
            // Fallback to API search
            fetchOrders(newSearch);
          });
        } else {
          // If search field is empty, fetch all orders
          fetchOrders({});
        }
      } else {
        // For all other fields, use the regular search API
        fetchOrders(newSearch);
      }
    }, 300); // 300ms debounce
  };
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Special handling for ID searches to ensure better matching
    if (search.id) {
      const idValue = search.id.trim();
      if (idValue) {
        // Get all orders and do client-side filtering for better ID matching
        setLoading(true);
        getWorkOrders().then(allOrders => {
          const filteredOrders = allOrders.filter(order => {
            return (
              (order._id && order._id.toLowerCase().includes(idValue.toLowerCase())) ||
              (order.uniqueId && order.uniqueId.toLowerCase().includes(idValue.toLowerCase()))
            );
          });
          
          setOrders(filteredOrders);
          setLoading(false);
        }).catch(err => {
          console.error("Error in manual search by ID:", err);
          // Fallback to API search
          fetchOrders(search);
        });
        return;
      }
    }
    
    // For other searches use the standard fetch
    fetchOrders(search);
  };
  
  const clearSearch = () => {
    setSearch({});
    fetchOrders({});
  };

  // Modal handlers
  const handleAdd = () => {
    setCurrentOrder(null);
    setIsEdit(false);
    setShowModal(true);
  };

  const handleEdit = (order) => {
    // Do nothing or show a message if needed
    // setCurrentOrder(order);
    // setIsEdit(true);
    // setShowModal(true);
  };
  // Function to show delete confirmation modal
  const handleDelete = (id) => {
    setOrderToDelete(id);
    setShowDeleteConfirmModal(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkOrder(orderToDelete);
      setAlert({ type: "success", message: "Work order deleted successfully!" });
      fetchOrders();
      setShowDeleteConfirmModal(false);
      setOrderToDelete(null);
    } catch (error) {
      setAlert({ type: "error", message: "Failed to delete work order" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setOrderToDelete(null);
  };

  // Download filtered orders as Excel
  const handleDownloadFilteredExcel = () => {
    if (!orders || orders.length === 0) {
      toast.info("No work orders to export.");
      return;
    }
    const allOrders = orders.map(order => ({
      "Order ID": order._id,
      "Unique ID": order.uniqueId,
      "Date of Survey": order.dateOfSurvey,
      "Surveyors": Array.isArray(order.surveyors) ? order.surveyors.join(", ") : order.surveyors,
      "Confined Space Name/ID": order.confinedSpaceNameOrId,
      "Building": order.building,
      "Location Description": order.locationDescription,
      "Confined Space Description": order.confinedSpaceDescription,
      "Confined Space": order.confinedSpace ? "Yes" : "No",
      "Permit Required": order.permitRequired ? "Yes" : "No",
      "Entry Requirements": order.entryRequirements,
      "Atmospheric Hazard": order.atmosphericHazard ? "Yes" : "No",
      "Atmospheric Hazard Description": order.atmosphericHazardDescription,
      "Engulfment Hazard": order.engulfmentHazard ? "Yes" : "No",
      "Engulfment Hazard Description": order.engulfmentHazardDescription,
      "Configuration Hazard": order.configurationHazard ? "Yes" : "No",
      "Configuration Hazard Description": order.configurationHazardDescription,
      "Other Recognized Hazards": order.otherRecognizedHazards ? "Yes" : "No",
      "Other Hazards Description": order.otherHazardsDescription,
      "PPE Required": order.ppeRequired ? "Yes" : "No",
      "PPE List": order.ppeList,
      "Forced Air Ventilation Sufficient": order.forcedAirVentilationSufficient ? "Yes" : "No",
      "Dedicated Continuous Air Monitor": order.dedicatedContinuousAirMonitor ? "Yes" : "No",
      "Warning Sign Posted": order.warningSignPosted ? "Yes" : "No",
      "Other People Working Near Space": order.otherPeopleWorkingNearSpace ? "Yes" : "No",
      "Can Others See Into Space": order.canOthersSeeIntoSpace ? "Yes" : "No",
      "Contractors Enter Space": order.contractorsEnterSpace ? "Yes" : "No",
      "Number Of Entry Points": order.numberOfEntryPoints,
      "Notes": order.notes,
      "Pictures": Array.isArray(order.pictures) ? order.pictures.join(", ") : order.pictures,
    }));

    const ws = XLSX.utils.json_to_sheet(allOrders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");
    XLSX.writeFile(wb, "confined-space-work-orders.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Confined Space Work Orders</h1>
              <p className="mt-2 text-base sm:text-lg text-gray-700">Manage and track confined space work orders</p>
            </div>
          </div>
        </div>

        {/* Alert Section */}
        <div className="mb-6 sm:mb-8">
          <WorkOrderAlert type={alert.type} message={alert.message} />
        </div>        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <WorkOrderSearch 
              search={search} 
              onChange={handleSearchChange} 
              onSearch={handleSearch} 
              onClear={clearSearch}
            />
            <button
              onClick={handleDownloadFilteredExcel}
              className="mt-2 sm:mt-0 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow transition-all"
              title="Download filtered work orders as Excel"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Filtered
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">              <WorkOrderTable 
                orders={orders} 
                onEdit={undefined} // Disable edit for admin
                onDelete={handleDelete}
                searchParams={search}
              />
            </div>
          )}
        </div>
      </div>      {/* Add/Edit Modal */}
      <WorkOrderModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={() => {
          fetchOrders();
          setShowModal(false);
        }}
        order={currentOrder}
        isEdit={false} // Always false for admin
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Confirm Delete</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this work order? This action cannot be undone.
            </p>
            <div className="flex space-x-4 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                disabled={isDeleting} // Disable button while deleting
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrderManagementPage;
